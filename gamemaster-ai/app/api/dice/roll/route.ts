import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

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
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId, characterId, diceType, count, modifier, purpose } = body;

    // Validation
    if (!diceType || typeof diceType !== 'string') {
      return NextResponse.json(
        { message: 'Zar tipi gerekiyor' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
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
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Erişim kontrolü
    const hasAccess = session.campaign.creatorId === userId ||
      session.campaign.players.some((p: any) => p.userId === userId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Zar at
    const diceCount = count || 1;
    const diceModifier = modifier || 0;
    
    // Zar tipini doğrula
    const validDiceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
    if (!validDiceTypes.includes(diceType)) {
      return NextResponse.json(
        { message: 'Geçersiz zar tipi' },
        { status: 400 }
      );
    }

    // Zar değerini hesapla
    const diceSides = parseInt(diceType.replace('d', ''));
    const results: number[] = [];
    let total = 0;

    for (let i = 0; i < diceCount; i++) {
      const result = Math.floor(Math.random() * diceSides) + 1;
      results.push(result);
      total += result;
    }

    total += diceModifier;

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
        purpose,
      },
    });

    // Zar sonucu mesajı
    let rollMessage = `🎲 ${diceCount > 1 ? `${diceCount}x` : ''}${diceType}: [${results.join(', ')}]`;
    if (diceModifier !== 0) {
      rollMessage += ` ${diceModifier >= 0 ? '+' : ''}${diceModifier}`;
    }
    rollMessage += ` = **${total}**`;
    if (purpose) {
      rollMessage += ` (${purpose})`;
    }

    // d20 kritik kontrolü
    if (diceType === 'd20' && diceCount === 1) {
      if (results[0] === 20) {
        rollMessage += ' 🌟 **Kritik Başarı!**';
      } else if (results[0] === 1) {
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
          purpose,
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
        purpose,
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
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
