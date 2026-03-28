import { NextRequest, NextResponse } from 'next/server';
import { generateLocationImage } from '@/lib/ai/imageGenerator';
import { getUserId, unauthorizedResponse } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

function normalize(value: unknown, maxLength = 2000): string {
  if (!value) return '';
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}...`;
}

/**
 * POST /api/gm/generate-character-portrait
 * Karakter görünüşüne göre portre görseli üretir
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      name,
      race,
      characterClass,
      background,
      appearance,
      styleHints,
    } = body as {
      name?: string;
      race?: string;
      characterClass?: string;
      background?: string;
      appearance?: string;
      styleHints?: string;
    };

    const safeAppearance = normalize(appearance, 900);
    if (!safeAppearance) {
      return NextResponse.json(
        { success: false, error: 'Önce bir görünüş metni yazmalısınız.' },
        { status: 400 }
      );
    }

    const prompt = [
      'Fantasy RPG character portrait, high detail, professional concept art, cinematic lighting, cinematic composition, full face and upper body visible.',
      `Character name: ${normalize(name, 80) || 'RPG character'}`,
      race ? `Race: ${normalize(race, 100)}` : null,
      characterClass ? `Class: ${normalize(characterClass, 100)}` : null,
      background ? `Background: ${normalize(background, 160)}` : null,
      `Appearance: ${safeAppearance}`,
      styleHints ? normalize(styleHints, 220) : null,
      'No text, no watermark.',
    ].filter(Boolean).join(' ');

    const result = await generateLocationImage(prompt, 'other', {
      size: '1024x1024',
      model: 'google/gemini-2.5-flash-image',
      quality: 'standard',
      style: 'vivid',
    });

    if (!result.success || !result.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Portre üretilemedi',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt || prompt,
    });
  } catch (error) {
    console.error('Generate character portrait error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
