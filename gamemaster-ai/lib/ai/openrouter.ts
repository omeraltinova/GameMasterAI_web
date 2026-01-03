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

/**
 * OpenRouter API'ye istek gönderir
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = options?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet';
  const temperature = options?.temperature || 0.7;
  const maxTokens = options?.maxTokens || 10000;
  const requestId = generateRequestId();
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

    if (!response.ok) {
      const errorData: OpenRouterError = await response.json();
      const duration = Date.now() - startTime;
      
      // Hata durumunu logla
      logAIResponse({
        timestamp: new Date().toISOString(),
        requestId,
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
        error: errorData.error?.message || response.statusText,
      });
      
      throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json();
    const duration = Date.now() - startTime;
    
    // Başarılı yanıtı logla
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
    
    return data;
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    throw error;
  }
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
