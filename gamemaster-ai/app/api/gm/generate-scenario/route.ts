import { NextRequest, NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai/openrouter';
import { SCENARIO_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

/**
 * POST /api/gm/generate-scenario
 * AI senaryo oluşturma endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { genre, difficulty, theme, customInstructions } = body;

    // Validation
    if (!genre || typeof genre !== 'string') {
      return NextResponse.json(
        { message: 'Tür (genre) gerekiyor' },
        { status: 400 }
      );
    }

    if (!difficulty || typeof difficulty !== 'string') {
      return NextResponse.json(
        { message: 'Zorluk (difficulty) gerekiyor' },
        { status: 400 }
      );
    }

    // User prompt oluştur
    let userPrompt = `Yeni bir D&D 5e senaryosu oluştur:\n`;
    userPrompt += `**Tür:** ${genre}\n`;
    userPrompt += `**Zorluk:** ${difficulty}\n`;
    
    if (theme) {
      userPrompt += `**Tema:** ${theme}\n`;
    }
    
    if (customInstructions) {
      userPrompt += `**Ek Talimatlar:** ${customInstructions}\n`;
    }

    userPrompt += `\nYanıtı JSON formatında ver ve doğrudan parse edilebilir olsun.`;

    // AI'dan yanıt al
    const aiResponse = await getAIResponse(
      SCENARIO_GENERATION_PROMPT,
      userPrompt,
      {
        temperature: 0.9,
        maxTokens: 10000,
      }
    );

    // JSON parse et
    let scenarioData;
    try {
      // Yanıtın içindeki JSON'i bul
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scenarioData = JSON.parse(jsonMatch[0]);
      } else {
        // JSON bulunamazsa, tüm yanıtı parse etmeyi dene
        scenarioData = JSON.parse(aiResponse);
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      return NextResponse.json(
        { message: 'AI yanıtını işlerken hata oluştu', rawResponse: aiResponse },
        { status: 500 }
      );
    }

    const tags = Array.isArray(scenarioData.tags) ? scenarioData.tags : [];
    return NextResponse.json({
      success: true,
      scenario: {
        title: scenarioData.title || 'Adsız Senaryo',
        description: scenarioData.description || '',
        genre: scenarioData.genre || genre,
        difficulty: scenarioData.difficulty || difficulty,
        startingPrompt: scenarioData.startingPrompt || '',
        tags,
        worldSettings: scenarioData.worldSettings || null,
        isAIGenerated: true,
      },
    });
  } catch (error) {
    console.error('Scenario generation error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
