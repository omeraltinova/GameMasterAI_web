import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponse } from '@/lib/ai/openrouter';
import { MAP_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

/**
 * POST /api/gm/generate-map
 * AI harita görseli oluşturma endpoint'i
 * Not: Bu endpoint sadece prompt oluşturur, gerçek görsel oluşturma ayrı bir API gerektirir
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
    const { sessionId, locationName, locationType, atmosphere, details } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!locationName || typeof locationName !== 'string') {
      return NextResponse.json(
        { message: 'Lokasyon adı gerekiyor' },
        { status: 400 }
      );
    }

    if (!locationType || typeof locationType !== 'string') {
      return NextResponse.json(
        { message: 'Lokasyon türü gerekiyor' },
        { status: 400 }
      );
    }

    // Session'ı kontrol et
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    const hasAccess = gameSession.campaign.creatorId === userId ||
      gameSession.campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // User prompt oluştur
    let userPrompt = `Create a detailed D&D 5e style map:\n`;
    userPrompt += `**Location:** ${locationName}\n`;
    userPrompt += `**Type:** ${locationType}\n`;
    userPrompt += `**Atmosphere:** ${atmosphere || 'mysterious'}\n`;

    if (details && Array.isArray(details)) {
      userPrompt += `**Important Features:**\n`;
      details.forEach(detail => {
        userPrompt += `- ${detail}\n`;
      });
    }

    userPrompt += `\nStyle: D&D 5e, detailed, fantasy, 2D top-down view`;
    userPrompt += `\nLighting: ${atmosphere || 'mysterious'}`;
    userPrompt += `\nProvide a single, clear image generation prompt in English.`;

    // AI'dan prompt al
    const aiResponse = await getAIResponse(
      MAP_GENERATION_PROMPT,
      userPrompt,
      {
        temperature: 0.8,
        maxTokens: 10000,
      }
    );

    // Prompt'u temizle (AI'nin ek açıklamalarını kaldır)
    const imagePrompt = aiResponse
      .replace(/^[^:]*:/, '') // "Prompt:" gibi önekleri kaldır
      .replace(/["*]/g, '') // Tırnak ve yıldız işaretlerini kaldır
      .trim();

    // Haritayı veritabanına kaydet (prompt ile)
    const map = await prisma.map.create({
      data: {
        sessionId,
        name: locationName,
        description: `${locationType} - ${atmosphere || 'mysterious'}`,
        imageUrl: '', // Gerçek görsel oluşturma için ayrı API kullanılmalı
        isAIGenerated: true,
        prompt: imagePrompt,
      },
    });

    return NextResponse.json({
      success: true,
      map: {
        id: map.id,
        name: map.name,
        description: map.description,
        prompt: imagePrompt,
        isAIGenerated: true,
        note: 'Bu prompt bir image generation API (DALL-E, Stable Diffusion vb.) ile kullanılabilir',
      },
    });
  } catch (error) {
    console.error('Map generation error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
