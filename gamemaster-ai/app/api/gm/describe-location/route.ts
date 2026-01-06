import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';

/**
 * POST /api/gm/describe-location
 * Lokasyon betimleme endpoint'i
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

    // Session'ı kontrol et
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!gameSession) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // User prompt oluştur
    let userPrompt = `**Lokasyon:** ${locationName}\n`;
    userPrompt += `**Tür:** ${locationType || 'Genel'}\n`;
    userPrompt += `**Atmosfer:** ${atmosphere || 'mysterious'}\n`;
    
    if (details && Array.isArray(details)) {
      userPrompt += `**Önemli Özellikler:**\n`;
      details.forEach(detail => {
        userPrompt += `- ${detail}\n`;
      });
    }

    userPrompt += `\nBu lokasyonu detaylı ve atmosferik bir şekilde betimle.`;
    userPrompt += `\nOyuncuların ilgisini çekecek ve keşfetmeye teşvik edecek şekilde yaz.`;
    userPrompt += `\n5 duyuyu kullan (görme, işitme, dokunma, koku, tat).`;

    // Basit context
    const gameState = JSON.parse(gameSession.currentState || '{}');
    let contextPrompt = '';
    
    if (gameState.location) {
      contextPrompt += `**Önceki Lokasyon:** ${gameState.location}\n`;
    }
    
    if (gameState.activeNPCs && gameState.activeNPCs.length > 0) {
      contextPrompt += `**Aktif NPC'ler:** ${gameState.activeNPCs.join(', ')}\n`;
    }

    // AI'dan yanıt al
    const aiResponse = await getAIResponseWithContext(
      SYSTEM_PROMPT,
      contextPrompt,
      userPrompt,
      {
        temperature: 0.9,
      }
    );

    // Lokasyon betimleme mesajını kaydet
    const locationMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'GM',
        content: aiResponse,
        metadata: JSON.stringify({
          type: 'location_description',
          locationName,
          locationType,
          atmosphere,
        }),
      },
    });

    // Game state'i güncelle (lokasyonu işaretle)
    const updatedGameState = {
      ...gameState,
      location: locationName,
      locationType,
      atmosphere,
    };

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentState: JSON.stringify(updatedGameState),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      locationDescription: aiResponse,
      messageId: locationMessage.id,
      timestamp: locationMessage.timestamp,
      gameState: updatedGameState,
    });
  } catch (error) {
    console.error('Location description error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
