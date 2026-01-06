// OpenRouter API Client
// GameMaster AI için AI entegrasyonu

import { logAIResponse, generateRequestId } from './logger';

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
  }
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const primaryModel = options?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet';
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL;
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
    requestId
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
      requestId + '-fallback'
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
  requestId: string
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

  const model = options?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet';
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
