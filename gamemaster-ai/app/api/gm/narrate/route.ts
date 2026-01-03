import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT, getNarrationPrompt } from '@/lib/ai/prompts';
import { buildSessionContext } from '@/lib/ai/context';
import { getUserId } from '@/lib/auth/server';

/**
 * POST /api/gm/narrate
 * Hikaye anlatımı için AI endpoint'i
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
    const { sessionId, playerAction } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!playerAction || typeof playerAction !== 'string') {
      return NextResponse.json(
        { message: 'Geçersiz oyuncu aksiyonu' },
        { status: 400 }
      );
    }

    // Session'ı kontrol et
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            characters: true,
            players: {
              include: {
                user: true,
                character: true,
              },
            },
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

    // Kullanıcının bu session'da yetkisi var mı? (creator veya player olabilir)
    const isCreator = gameSession.campaign.creatorId === userId;
    const isPlayer = gameSession.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return NextResponse.json(
        { message: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Context oluştur
    const context = await buildSessionContext(sessionId);

    // AI'dan yanıt al
    const contextPrompt = contextToPrompt(context);
    const userPrompt = getNarrationPrompt(playerAction);

    const aiResponse = await getAIResponseWithContext(
      SYSTEM_PROMPT,
      contextPrompt,
      userPrompt,
      {
        temperature: 0.8,
        maxTokens: 2000,
      }
    );

    // Oyuncunun karakter adını bul
    const currentPlayer = gameSession.campaign.players.find(
      (p: any) => p.userId === userId
    );
    const playerName = currentPlayer?.character?.name || 
                       currentPlayer?.user?.username || 
                       'Oyuncu';

    // Oyuncu mesajını kaydet
    await prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        senderType: 'PLAYER',
        senderName: playerName,
        content: playerAction,
      },
    });

    // GM yanıtını kaydet
    const gmMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'GM',
        senderName: 'Game Master',
        content: aiResponse,
      },
    });

    // Session'ı güncelle
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      narration: aiResponse,
      messageId: gmMessage.id,
      timestamp: gmMessage.timestamp,
    });
  } catch (error) {
    console.error('Narration error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * Yardımcı fonksiyon: Context'i prompt'a çevirir
 */
function contextToPrompt(context: any): string {
  let prompt = '';

  if (context.scenario) {
    prompt += `**Senaryo:** ${context.scenario}\n\n`;
  }

  if (context.location) {
    prompt += `**Mevcut Lokasyon:** ${context.location}\n\n`;
  }

  if (context.activeNPCs && context.activeNPCs.length > 0) {
    prompt += '**Aktif NPC\'ler:**\n';
    context.activeNPCs.forEach((npc: any) => {
      prompt += `- ${npc.name} (${npc.role})`;
      if (npc.personality) {
        prompt += ` - ${npc.personality}`;
      }
      if (npc.isHostile) {
        prompt += ' [Düşman]';
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (context.playerCharacters && context.playerCharacters.length > 0) {
    prompt += '**Parti Üyeleri:**\n';
    context.playerCharacters.forEach((char: any) => {
      prompt += `- ${char.name} (Level ${char.level} ${char.race} ${char.class})`;
      prompt += ` - HP: ${char.hp}/${char.maxHp}\n`;
    });
    prompt += '\n';
  }

  if (context.recentMessages && context.recentMessages.length > 0) {
    prompt += '**Son Olaylar:**\n';
    const lastMessages = context.recentMessages.slice(-10);
    lastMessages.forEach((msg: any) => {
      const sender = msg.senderType === 'PLAYER' ? 'Oyuncu' : 
                    msg.senderType === 'GM' ? 'GM' : 
                    msg.senderType === 'SYSTEM' ? 'Sistem' : msg.senderType;
      prompt += `[${sender}]: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  return prompt.trim();
}
