// OpenRouter API Client
// GameMaster AI için AI entegrasyonu

import { logAIResponse, generateRequestId } from './logger';
import { getSystemSettings } from '@/lib/admin/systemSettings';
import { consumeAITokens } from '@/lib/security/aiRateLimit';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const SETTINGS_CACHE_MS = 30_000;

type AIModelConfig = {
  primaryModel: string;
  fallbackModel?: string;
  suggestionsModel?: string;
};

let cachedConfig: AIModelConfig | null = null;
let cachedAt = 0;

async function trackTokenUsage(userId: string | undefined, tokenCount: number | undefined) {
  if (!userId || typeof tokenCount !== 'number' || !Number.isFinite(tokenCount)) {
    return;
  }

  const normalized = Math.max(0, Math.floor(tokenCount));
  if (normalized <= 0) {
    return;
  }

  await consumeAITokens(userId, normalized);
}

async function resolveAIModelConfig(): Promise<AIModelConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < SETTINGS_CACHE_MS) {
    return cachedConfig;
  }

  try {
    const settings = await getSystemSettings();
    cachedConfig = {
      primaryModel:
        settings?.aiPrimaryModel ||
        process.env.OPENROUTER_MODEL ||
        'anthropic/claude-3-sonnet',
      fallbackModel: settings?.aiFallbackModel || process.env.OPENROUTER_FALLBACK_MODEL,
      suggestionsModel:
        settings?.aiSuggestionsModel ||
        process.env.OPENROUTER_SUGGESTIONS_MODEL ||
        undefined, // undefined ise primaryModel kullanılır
    };
  } catch (error) {
    console.error('Failed to load AI model settings:', error);
    cachedConfig = {
      primaryModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet',
      fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL,
      suggestionsModel: process.env.OPENROUTER_SUGGESTIONS_MODEL || undefined,
    };
  }

  cachedAt = now;
  return cachedConfig;
}

/**
 * Suggestions için model çözümler
 * Admin paneli > env variable > primary model sıralamasıyla
 */
export async function resolveSuggestionsModel(): Promise<string> {
  const config = await resolveAIModelConfig();
  return config.suggestionsModel || config.primaryModel;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(status: number, errorMessage?: string): boolean {
  // Retry on rate limits, server errors, and timeout-related errors
  if (status === 429 || status >= 500) return true;
  if (errorMessage?.toLowerCase().includes('timeout')) return true;
  if (errorMessage?.toLowerCase().includes('overloaded')) return true;
  return false;
}

/**
 * OpenRouter API'ye istek gönderir (retry ve fallback destekli)
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    skipFallback?: boolean;
    userId?: string;
  }
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const modelConfig = await resolveAIModelConfig();
  const primaryModel = options?.model || modelConfig.primaryModel;
  const fallbackModel = modelConfig.fallbackModel;
  const temperature = options?.temperature || 0.7;
  const maxTokens = options?.maxTokens || 10000;
  const requestId = generateRequestId();

  // Try primary model with retries
  const primaryResult = await callWithRetry(
    messages,
    primaryModel,
    temperature,
    maxTokens,
    apiKey,
    requestId,
    options?.userId,
  );

  if (primaryResult.success) {
    return primaryResult.response!;
  }

  // If primary failed and we have a fallback, try it
  if (fallbackModel && !options?.skipFallback) {
    console.log(`Primary model (${primaryModel}) failed, trying fallback model (${fallbackModel})...`);

    const fallbackResult = await callWithRetry(
      messages,
      fallbackModel,
      temperature,
      maxTokens,
      apiKey,
      requestId + '-fallback',
      options?.userId,
    );

    if (fallbackResult.success) {
      return fallbackResult.response!;
    }

    // Both failed
    throw new Error(`AI service unavailable. Primary (${primaryModel}) and fallback (${fallbackModel}) models failed. Last error: ${fallbackResult.error}`);
  }

  // No fallback, throw the primary error
  throw new Error(primaryResult.error || 'AI service unavailable');
}

/**
 * Make API call with retry logic
 */
async function callWithRetry(
  messages: OpenRouterMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
  requestId: string,
  userId?: string,
): Promise<{ success: boolean; response?: OpenRouterResponse; error?: string }> {
  let lastError: string = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'GameMaster AI',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData: OpenRouterError = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        lastError = `${model}: ${errorMessage}`;

        // Log the error
        logAIResponse({
          timestamp: new Date().toISOString(),
          requestId: `${requestId}-attempt${attempt}`,
          model,
          temperature,
          maxTokens,
          messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 500) + (m.content.length > 500 ? '...' : '') })),
          response: {
            content: '',
            finishReason: 'error',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          },
          duration,
          error: `Attempt ${attempt}/${MAX_RETRIES}: ${errorMessage}`,
        });

        // Check if we should retry
        if (isRetryableError(response.status, errorMessage) && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retry ${attempt}/${MAX_RETRIES} for ${model} after ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // Non-retryable error or max retries reached
        return { success: false, error: lastError };
      }

      const data: OpenRouterResponse = await response.json();
      await trackTokenUsage(userId, data.usage?.total_tokens);

      // Log success
      logAIResponse({
        timestamp: new Date().toISOString(),
        requestId,
        model,
        temperature,
        maxTokens,
        messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 500) + (m.content.length > 500 ? '...' : '') })),
        response: {
          content: data.choices[0]?.message?.content || '',
          finishReason: data.choices[0]?.finish_reason || 'unknown',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        },
        duration,
      });

      return { success: true, response: data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastError = `${model}: ${errorMessage}`;

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Network error, retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
        await sleep(delay);
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}


/**
 * Streaming response için (opsiyonel, gelecekte eklenebilir)
 */
export async function callOpenRouterStream(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ReadableStream> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const modelConfig = await resolveAIModelConfig();
  const model = options?.model || modelConfig.primaryModel;
  const temperature = options?.temperature || 0.7;
  const maxTokens = options?.maxTokens || 10000;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'GameMaster AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData: OpenRouterError = await response.json();
    throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
  }

  return response.body!;
}

/**
 * AI yanıtını güvenli bir şekilde alır
 */
export async function getAIResponse(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
  }
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callOpenRouter(messages, options);

  if (!response.choices || response.choices.length === 0) {
    throw new Error('No response from AI');
  }

  return response.choices[0].message.content;
}

/**
 * Context ile birlikte AI yanıtını alır
 */
export async function getAIResponseWithContext(
  systemPrompt: string,
  contextPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    userId?: string;
  }
): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: contextPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callOpenRouter(messages, options);

  if (!response.choices || response.choices.length === 0) {
    throw new Error('No response from AI');
  }

  return response.choices[0].message.content;
}

import { ToolDefinition, ToolCall, gmTools } from './tools';
import { executeToolCalls, ToolExecutionResult } from './toolExecutor';

export interface OpenRouterResponseWithTools {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Tek bir chat-completion isteği gönderir; geçici hatalarda (429/5xx/timeout)
 * üstel geri çekilmeyle yeniden dener. Başarısız olursa hata fırlatır.
 */
async function postChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<OpenRouterResponseWithTools> {
  let lastError = 'AI service unavailable';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'GameMaster AI',
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      lastError = networkError instanceof Error ? networkError.message : 'Network error';
      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
        continue;
      }
      throw new Error(lastError);
    }

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {
        /* response body was not JSON */
      }
      lastError = errorMessage;

      if (isRetryableError(response.status, errorMessage) && attempt < MAX_RETRIES) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
        continue;
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as OpenRouterResponseWithTools;
  }

  throw new Error(lastError);
}

/**
 * AI Tool Calling ile çağrı yapar
 * NPC oluşturma, item verme gibi işlemleri AI otomatik yapabilir
 */
export async function callOpenRouterWithTools(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: ToolDefinition[];
    sessionId?: string;
    characterId?: string;
    userId?: string;
  }
): Promise<{
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const modelConfig = await resolveAIModelConfig();
  const model = options?.model || modelConfig.primaryModel;
  const fallbackModel = modelConfig.fallbackModel;
  const temperature = options?.temperature || 0.7;
  const maxTokens = options?.maxTokens || 10000;
  const tools = options?.tools || gmTools;

  // The primary tool-calling request is the most important AI call in the game
  // loop, so give it the same resilience as callOpenRouter: retry transient
  // failures and fall back to the secondary model before giving up.
  const runCompletion = async (body: Record<string, unknown>) => {
    try {
      return await postChatCompletion(apiKey, { ...body, model });
    } catch (primaryError) {
      if (fallbackModel && fallbackModel !== model) {
        console.warn(
          `[AI tools] primary model (${model}) failed, trying fallback (${fallbackModel}):`,
          primaryError instanceof Error ? primaryError.message : primaryError,
        );
        return await postChatCompletion(apiKey, { ...body, model: fallbackModel });
      }
      throw primaryError;
    }
  };

  try {
    const data = await runCompletion({
      messages,
      temperature,
      max_tokens: maxTokens,
      tools,
      tool_choice: 'auto', // Let AI decide when to use tools
    });
    await trackTokenUsage(options?.userId, data.usage?.total_tokens);
    const choice = data.choices[0];

    if (!choice) {
      throw new Error('No response from AI');
    }

    let content = choice.message.content || '';
    const toolCalls = choice.message.tool_calls;

    // If there are tool calls, execute them
    if (toolCalls && toolCalls.length > 0 && options?.sessionId) {
      console.log(`[AI] Executing ${toolCalls.length} tool calls...`);
      const toolResults = await executeToolCalls(
        toolCalls,
        options.sessionId,
        options.characterId
      );

      // If content is empty after tool calls, get a follow-up response
      if (!content || content.trim() === '') {
        console.log('[AI] Content empty after tool calls, getting follow-up response...');

        // Build tool results summary for follow-up
        const toolResultsSummary = toolResults.map(r => {
          if (r.toolName === 'create_npc' && r.success) {
            return `NPC "${r.result?.name}" (${r.result?.role || 'unknown role'}) oluşturuldu.`;
          } else if (r.toolName === 'give_item' && r.success) {
            return `"${r.result?.itemName}" oyuncuya verildi.`;
          } else if (r.toolName === 'request_dice_roll' && r.success) {
            return `${r.result?.skill} için ${r.result?.diceType} atışı istendi (DC ${r.result?.dc}).`;
          } else if (r.toolName === 'update_npc' && r.success) {
            return `NPC güncellendi.`;
          }
          return null;
        }).filter(Boolean).join(' ');

        // Make follow-up call to get narrative
        const followUpMessages: OpenRouterMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: `[Tool işlemleri tamamlandı: ${toolResultsSummary}]`
          },
          {
            role: 'user',
            content: 'Şimdi hikayeyi devam ettir ve yukarıdaki işlemleri anlatıma entegre et. Tool çağrısı yapma, sadece hikaye anlatımını yap.'
          },
        ];

        // Follow-up narration is best-effort: if it fails we keep the tool-only
        // content rather than failing the whole turn.
        try {
          const followUpData = await runCompletion({
            messages: followUpMessages,
            temperature,
            max_tokens: maxTokens,
            // No tools in follow-up to force text response
          });
          await trackTokenUsage(options?.userId, followUpData.usage?.total_tokens);
          content = followUpData.choices[0]?.message?.content || content;
          console.log('[AI] Got follow-up response with content');
        } catch (followUpError) {
          console.warn(
            '[AI] Follow-up response failed; keeping tool-only content:',
            followUpError instanceof Error ? followUpError.message : followUpError,
          );
        }
      }

      return {
        content,
        toolCalls,
        toolResults,
      };
    }

    return { content };
  } catch (error) {
    console.error('callOpenRouterWithTools error:', error);
    throw error;
  }
}
