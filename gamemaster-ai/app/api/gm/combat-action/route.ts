import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';

/**
 * POST /api/gm/combat-action
 * Savaş aksiyonu yorumlama endpoint'i
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
    const { sessionId, action, attacker, target, rollResult, damage } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { message: 'Aksiyon gerekiyor' },
        { status: 400 }
      );
    }

    if (!attacker || typeof attacker !== 'string') {
      return NextResponse.json(
        { message: 'Saldıran bilgisi gerekiyor' },
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
    let userPrompt = `**Savaş Aksiyonu:**\n`;
    userPrompt += `Saldıran: ${attacker}\n`;
    userPrompt += `Aksiyon: ${action}\n`;
    
    if (target) {
      userPrompt += `Hedef: ${target}\n`;
    }
    
    if (rollResult !== undefined) {
      userPrompt += `Zar Sonucu: ${rollResult}\n`;
    }
    
    if (damage !== undefined) {
      userPrompt += `Hasar: ${damage}\n`;
    }

    userPrompt += `\nBu savaş aksiyonunu D&D 5e kurallarına uygun olarak betimle.`;
    userPrompt += `\nSonuçları açıkla ve hikayeyi ilerlet.`;

    // Basit context (oyuncular ve durum)
    const gameState = JSON.parse(gameSession.currentState || '{}');
    let contextPrompt = `**Savaş Durumu:** ${gameState.inCombat ? 'Savaşta' : 'Savaşta değil'}\n`;
    
    if (gameState.activeQuests && gameState.activeQuests.length > 0) {
      contextPrompt += `**Aktif Görev:** ${gameState.activeQuests[0]}\n`;
    }

    // AI'dan yanıt al
    const aiResponse = await getAIResponseWithContext(
      SYSTEM_PROMPT,
      contextPrompt,
      userPrompt,
      {
        temperature: 0.7,
        maxTokens: 10000,
      }
    );

    // Savaş mesajını kaydet
    const combatMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'COMBAT',
        content: aiResponse,
        metadata: JSON.stringify({
          action,
          attacker,
          target,
          rollResult,
          damage,
          isCombatAction: true,
        }),
      },
    });

    // Game state'i güncelle (savaş durumunu işaretle)
    const updatedGameState = {
      ...gameState,
      inCombat: true,
      lastCombatAction: {
        action,
        attacker,
        target,
        rollResult,
        damage,
        timestamp: new Date().toISOString(),
      },
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
      combatNarration: aiResponse,
      messageId: combatMessage.id,
      timestamp: combatMessage.timestamp,
      gameState: updatedGameState,
    });
  } catch (error) {
    console.error('Combat action error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
