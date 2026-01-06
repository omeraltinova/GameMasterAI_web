import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponse } from '@/lib/ai/openrouter';
import { SCENARIO_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';

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

    // Senaryoyu veritabanına kaydet
    const scenario = await prisma.scenario.create({
      data: {
        title: scenarioData.title || 'Adsız Senaryo',
        description: scenarioData.description || '',
        genre: genre,
        difficulty: difficulty,
        startingPrompt: scenarioData.startingPrompt || '',
        isAIGenerated: true,
        creatorId: userId,
        tags: JSON.stringify(scenarioData.tags || []),
        // @ts-ignore - Prisma client out of sync
        worldSettings: scenarioData.worldSettings ? JSON.stringify(scenarioData.worldSettings) : null,
      },
    });

    return NextResponse.json({
      success: true,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        genre: scenario.genre,
        difficulty: scenario.difficulty,
        startingPrompt: scenario.startingPrompt,
        tags: scenarioData.tags || [],
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
