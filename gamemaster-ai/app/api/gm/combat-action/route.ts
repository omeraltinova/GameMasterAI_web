import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

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
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
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
      sessionId,
      action,
      attacker,
      target,
      rollResult,
      damage,
      // Grounding fields from the mechanical combat engine (combat/[id]/action)
      combatId,
      hit,
      crit,
      defeated,
      combatEnded,
      targetHpRemaining,
      targetMaxHp,
    } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Aksiyon gerekiyor' },
        { status: 400 }
      );
    }

    if (!attacker || typeof attacker !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Saldıran bilgisi gerekiyor' },
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
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    const hasAccess = gameSession.campaign.creatorId === userId ||
      gameSession.campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Mekanik savaş motoru gerçeğine demirle: combatId verildiyse gerçek Combat
    // kaydını oku. Savaş durumu artık uydurulmuyor — gerçek statüden türetiliyor.
    let linkedCombat: { id: string; sessionId: string; status: string } | null = null;
    if (combatId && typeof combatId === 'string') {
      const found = await prisma.combat.findUnique({
        where: { id: combatId },
        select: { id: true, sessionId: true, status: true },
      });
      if (found && found.sessionId === sessionId) {
        linkedCombat = found;
      }
    }

    // User prompt oluştur
    let userPrompt = `**Savaş Aksiyonu:**\n`;
    userPrompt += `Saldıran: ${attacker}\n`;
    userPrompt += `Aksiyon: ${action}\n`;

    if (target) {
      userPrompt += `Hedef: ${target}\n`;
    }

    // Mekanik sonuç (varsa) — AI bunu birebir anlatmalı, kendi sonuç uydurmamalı.
    if (typeof hit === 'boolean') {
      userPrompt += `Sonuç: ${hit ? (crit ? 'KRİTİK İSABET' : 'İsabet') : 'Işkalama'}\n`;
    }
    if (rollResult !== undefined && rollResult !== null) {
      userPrompt += `Saldırı Zarı: ${rollResult}\n`;
    }
    if (damage !== undefined && damage !== null) {
      userPrompt += `Hasar: ${damage}\n`;
    }
    if (typeof targetHpRemaining === 'number') {
      const maxPart = typeof targetMaxHp === 'number' ? `/${targetMaxHp}` : '';
      userPrompt += `Hedefin Kalan HP: ${targetHpRemaining}${maxPart}\n`;
    }
    if (defeated === true) {
      userPrompt += `Hedef etkisiz hale geldi.\n`;
    }
    if (combatEnded === true) {
      userPrompt += `Bu aksiyonla savaş sona erdi.\n`;
    }

    userPrompt += `\nBu savaş aksiyonunu 5e SRD kurallarına uygun olarak betimle.`;
    userPrompt += `\nYukarıda verilen mekanik sonuçlara (isabet/ışkalama, hasar, kalan HP) sadık kal; yeni sonuç veya hasar uydurma.`;
    userPrompt += `\nSonuçları açıkla ve hikayeyi ilerlet.`;

    // Basit context (oyuncular ve durum)
    const gameState = JSON.parse(gameSession.currentState || '{}');

    // Gerçek savaş durumu: bağlı Combat kaydı varsa onun statüsü; yoksa eski
    // davranışa (gameState.inCombat / true) düş.
    const computedInCombat = linkedCombat
      ? linkedCombat.status === 'active'
      : combatEnded === true
        ? false
        : (typeof gameState.inCombat === 'boolean' ? gameState.inCombat : true);

    let contextPrompt = `**Savaş Durumu:** ${computedInCombat ? 'Savaşta' : 'Savaşta değil'}\n`;
    
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
        userId,
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

    // Game state'i güncelle — savaş durumu gerçek Combat kaydından türetiliyor,
    // artık körü körüne true yapılmıyor (iki savaş yolu birleştirildi).
    const updatedGameState = {
      ...gameState,
      inCombat: computedInCombat,
      lastCombatAction: {
        action,
        attacker,
        target,
        rollResult,
        damage,
        hit: typeof hit === 'boolean' ? hit : undefined,
        defeated: defeated === true ? true : undefined,
        combatId: linkedCombat?.id,
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
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
