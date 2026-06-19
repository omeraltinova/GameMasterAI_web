import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

const MIN_DICE_COUNT = 1;
const MAX_DICE_COUNT = 20;
const MIN_DICE_MODIFIER = -100;
const MAX_DICE_MODIFIER = 100;
const MAX_PURPOSE_LENGTH = 120;

/**
 * POST /api/dice/roll
 * Zar atma endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü - NextAuth session kullan
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = await rateLimitResponse(userId, "POST:/api/dice/roll", RATE_LIMIT_TIERS.GAME_ACTION);
    if (limited) return limited;

    const body = await req.json();
    const { sessionId, characterId, diceType, count, modifier, purpose, advantage, disadvantage } = body;

    // Validation
    if (!diceType || typeof diceType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Zar tipi gerekiyor' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    const parsedDiceCount = count === undefined ? 1 : Number(count);
    if (!Number.isInteger(parsedDiceCount) || parsedDiceCount < MIN_DICE_COUNT || parsedDiceCount > MAX_DICE_COUNT) {
      return NextResponse.json(
        { success: false, error: `Zar adedi ${MIN_DICE_COUNT}-${MAX_DICE_COUNT} arasında tam sayı olmalı` },
        { status: 400 }
      );
    }

    const parsedModifier = modifier === undefined ? 0 : Number(modifier);
    if (!Number.isInteger(parsedModifier) || parsedModifier < MIN_DICE_MODIFIER || parsedModifier > MAX_DICE_MODIFIER) {
      return NextResponse.json(
        { success: false, error: `Zar modifiyeri ${MIN_DICE_MODIFIER} ile ${MAX_DICE_MODIFIER} arasında tam sayı olmalı` },
        { status: 400 }
      );
    }

    if (advantage !== undefined && typeof advantage !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'advantage alanı boolean olmalı' },
        { status: 400 }
      );
    }

    if (disadvantage !== undefined && typeof disadvantage !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'disadvantage alanı boolean olmalı' },
        { status: 400 }
      );
    }

    if (advantage === true && disadvantage === true) {
      return NextResponse.json(
        { success: false, error: 'Aynı anda hem avantaj hem dezavantaj uygulanamaz' },
        { status: 400 }
      );
    }

    const normalizedPurpose = typeof purpose === 'string' ? purpose.trim() : undefined;
    if (purpose !== undefined && typeof purpose !== 'string') {
      return NextResponse.json(
        { success: false, error: 'purpose metin olmalı' },
        { status: 400 }
      );
    }

    if (normalizedPurpose && normalizedPurpose.length > MAX_PURPOSE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `purpose en fazla ${MAX_PURPOSE_LENGTH} karakter olabilir` },
        { status: 400 }
      );
    }

    // Session'ı kontrol et
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Erişim kontrolü
    const hasAccess = session.campaign.creatorId === userId ||
      session.campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    if (characterId) {
      const character = await prisma.character.findFirst({
        where: { id: characterId, userId },
        select: { id: true, campaignId: true },
      });

      if (!character) {
        return NextResponse.json(
          { success: false, error: 'Bu karaktere erişim yetkiniz yok' },
          { status: 403 }
        );
      }

      if (character.campaignId !== session.campaignId) {
        return NextResponse.json(
          { success: false, error: 'Bu karakter bu oturuma ait değil' },
          { status: 400 }
        );
      }
    }

    // Zar at
    const diceCount = parsedDiceCount;
    const diceModifier = parsedModifier;
    const hasAdvantage = advantage === true;
    const hasDisadvantage = disadvantage === true;

    // Zar tipini doğrula
    const validDiceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
    if (!validDiceTypes.includes(diceType)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz zar tipi' },
        { status: 400 }
      );
    }

    // Zar değerini hesapla
    const diceSides = parseInt(diceType.replace('d', ''));
    const results: number[] = [];
    let total = 0;

    // Advantage/Disadvantage sadece d20 ve tek zar için geçerli
    if (diceType === 'd20' && diceCount === 1 && (hasAdvantage || hasDisadvantage)) {
      // 2 kez at
      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;

      results.push(roll1, roll2);

      // Avantaj: yüksek olanı al, Dezavantaj: düşük olanı al
      const chosenRoll = hasAdvantage ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      total = chosenRoll + diceModifier;
    } else {
      // Normal atış
      for (let i = 0; i < diceCount; i++) {
        const result = Math.floor(Math.random() * diceSides) + 1;
        results.push(result);
        total += result;
      }
      total += diceModifier;
    }

    // Zar sonucunu kaydet
    const diceRoll = await prisma.diceRoll.create({
      data: {
        sessionId,
        characterId,
        diceType,
        count: diceCount,
        results: JSON.stringify(results),
        modifier: diceModifier,
        total,
        purpose: normalizedPurpose || (hasAdvantage ? 'Avantajlı Atış' : hasDisadvantage ? 'Dezavantajlı Atış' : undefined),
      },
    });

    // Zar sonucu mesajı
    let rollMessage = '';

    if (diceType === 'd20' && diceCount === 1 && (hasAdvantage || hasDisadvantage)) {
      // Advantage/Disadvantage message format
      const roll1 = results[0];
      const roll2 = results[1];
      const chosenRoll = hasAdvantage ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      const discardedRoll = hasAdvantage ? Math.min(roll1, roll2) : Math.max(roll1, roll2);

      rollMessage = `🎲 d20 ${hasAdvantage ? '✨ Avantaj' : '⚠️ Dezavantaj'}: [${chosenRoll}] ~~${discardedRoll}~~`;
      if (diceModifier !== 0) {
        rollMessage += ` ${diceModifier >= 0 ? '+' : ''}${diceModifier}`;
      }
      rollMessage += ` = **${total}**`;
    } else {
      // Normal message format
      rollMessage = `🎲 ${diceCount > 1 ? `${diceCount}x` : ''}${diceType}: [${results.join(', ')}]`;
      if (diceModifier !== 0) {
        rollMessage += ` ${diceModifier >= 0 ? '+' : ''}${diceModifier}`;
      }
      rollMessage += ` = **${total}**`;
    }

    if (normalizedPurpose) {
      rollMessage += ` (${normalizedPurpose})`;
    }

    // d20 kritik kontrolü
    const isAdvantageRoll = diceType === 'd20' && diceCount === 1 && (hasAdvantage || hasDisadvantage);
    const effectiveRoll = isAdvantageRoll
      ? (hasAdvantage ? Math.max(results[0], results[1]) : Math.min(results[0], results[1]))
      : results[0];

    if (diceType === 'd20' && (diceCount === 1 || isAdvantageRoll)) {
      if (effectiveRoll === 20) {
        rollMessage += ' 🌟 **Kritik Başarı!**';
      } else if (effectiveRoll === 1) {
        rollMessage += ' 💀 **Kritik Başarısızlık!**';
      }
    }

    // Zar mesajını kaydet
    const message = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'DICE',
        senderName: 'Zar Atışı',
        content: rollMessage,
        metadata: JSON.stringify({
          diceType,
          count: diceCount,
          results,
          modifier: diceModifier,
          total,
          purpose: normalizedPurpose,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      results,
      total,
      roll: {
        id: diceRoll.id,
        sessionId: diceRoll.sessionId,
        characterId: diceRoll.characterId,
        diceType,
        count: diceCount,
        results,
        modifier: diceModifier,
        total,
        purpose: normalizedPurpose,
        timestamp: diceRoll.timestamp,
      },
      message: {
        id: message.id,
        sessionId: message.sessionId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
      },
    });
  } catch (error) {
    console.error('Dice roll error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
