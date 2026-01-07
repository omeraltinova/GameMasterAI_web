// Image Generation via OpenRouter
// Mekan görselleri üretmek için

import { logAIResponse, generateRequestId } from './logger';

export interface ImageGenerationOptions {
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  revisedPrompt?: string;
}

/**
 * OpenRouter üzerinden görsel üret
 * DALL-E 3 veya benzeri modeller kullanır
 */
export async function generateLocationImage(
  prompt: string,
  locationType: string,
  options?: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'OPENROUTER_API_KEY environment variable is not set'
    };
  }

  // Model seçimi - Image generation destekleyen modeller
  // OpenRouter'da modalities ile çalışan modeller: flux-pro, stable-diffusion vb.
  const model = options?.model || 'openai/gpt-5-image';
  const size = options?.size || '1792x1024'; // Landscape for location images
  const quality = options?.quality || 'standard';
  const style = options?.style || 'vivid';

  const requestId = generateRequestId();
  const startTime = Date.now();

  // D&D tarzı prompt zenginleştirme
  const enhancedPrompt = `Fantasy RPG location illustration, D&D style, detailed environment art: ${prompt}. High quality digital painting, atmospheric lighting, rich details, suitable for tabletop RPG.`;

  console.log(`[ImageGen] Starting image generation - Request ID: ${requestId}`);
  console.log(`[ImageGen] Model: ${model}, Prompt length: ${enhancedPrompt.length}`);

  try {
    // OpenRouter uses chat completions endpoint for image models
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'GameMaster AI - Location Image',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: enhancedPrompt,
          }
        ],
        modalities: ['image', 'text'], // Required for image generation
        stream: false,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[ImageGen] Response status: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error(`[ImageGen] Error response:`, JSON.stringify(errorData));

      // Log error
      logAIResponse({
        timestamp: new Date().toISOString(),
        requestId,
        model,
        temperature: 0,
        maxTokens: 0,
        messages: [{ role: 'user', content: enhancedPrompt }],
        response: {
          content: '',
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        },
        duration,
        error: errorData.error?.message || response.statusText,
      });

      return {
        success: false,
        error: `Image generation failed: ${errorData.error?.message || response.statusText}`
      };
    }

    const data = await response.json();

    // OpenRouter image models return images in the message.images field
    const message = data.choices?.[0]?.message;
    console.log(`[ImageGen] Message has images:`, !!message?.images, `Image count:`, message?.images?.length || 0);

    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const imageUrl = message.images[0]?.image_url?.url;

      if (imageUrl) {
        console.log(`[ImageGen] Image URL found:`, imageUrl.substring(0, 100));

        // Log success
        logAIResponse({
          timestamp: new Date().toISOString(),
          requestId,
          model,
          temperature: 0,
          maxTokens: 0,
          messages: [{ role: 'user', content: enhancedPrompt }],
          response: {
            content: `Image generated: ${imageUrl.substring(0, 50)}...`,
            finishReason: data.choices?.[0]?.finish_reason || 'stop',
            usage: {
              promptTokens: data.usage?.prompt_tokens || 0,
              completionTokens: data.usage?.completion_tokens || 0,
              totalTokens: data.usage?.total_tokens || 0
            },
          },
          duration,
        });

        return {
          success: true,
          imageUrl: imageUrl,
          revisedPrompt: message.content || enhancedPrompt,
        };
      }
    }

    // Fallback: check if content contains a URL
    const messageContent = message?.content;
    if (messageContent) {
      const urlMatch = messageContent.match(/https?:\/\/[^\s\])"']+/i);
      if (urlMatch) {
        console.log(`[ImageGen] URL found in content:`, urlMatch[0]);
        return {
          success: true,
          imageUrl: urlMatch[0],
          revisedPrompt: enhancedPrompt,
        };
      }
    }

    console.error(`[ImageGen] No image URL found in response. Message:`, message);
    console.error(`[ImageGen] Has images field:`, !!message?.images);

    return {
      success: false,
      error: 'No image URL returned from model. The model may not support image generation or modalities are not configured correctly.'
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logAIResponse({
      timestamp: new Date().toISOString(),
      requestId,
      model,
      temperature: 0,
      maxTokens: 0,
      messages: [{ role: 'user', content: enhancedPrompt }],
      response: {
        content: '',
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
      duration,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Lokasyon tipine göre stil belirle
 */
export function getLocationStyleHints(locationType: string): string {
  const styles: Record<string, string> = {
    tavern: 'warm interior lighting, wooden beams, cozy atmosphere, medieval inn',
    dungeon: 'dark and mysterious, torch-lit corridors, ancient stone walls, danger lurking',
    forest: 'lush green canopy, dappled sunlight, mystical atmosphere, ancient trees',
    cave: 'dark cavern, stalactites, underground pool, crystal formations, eerie glow',
    castle: 'majestic stone architecture, towers and battlements, grand halls, medieval fortress',
    town: 'bustling medieval marketplace, cobblestone streets, merchant stalls, townspeople',
    port: 'harbor with ships, wooden docks, salty sea air, sailors and merchants',
    road: 'winding path through landscape, travel scene, distant horizon, journey',
    camp: 'campfire at night, tents, starlit sky, adventurers resting',
    other: 'fantasy landscape, magical atmosphere, detailed environment',
  };

  return styles[locationType] || styles.other;
}
