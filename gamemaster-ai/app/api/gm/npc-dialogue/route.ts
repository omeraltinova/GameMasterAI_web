import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

/**
 * POST /api/gm/npc-dialogue
 * NPC diyalog sistemi için AI endpoint'i
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
    const { sessionId, npcId, playerMessage } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!npcId) {
      return NextResponse.json(
        { message: 'NPC ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!playerMessage || typeof playerMessage !== 'string') {
      return NextResponse.json(
        { message: 'Geçersiz oyuncu mesajı' },
        { status: 400 }
      );
    }

    // Session ve NPC'yi kontrol et
    const [gameSession, npc] = await Promise.all([
      prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          campaign: {
            include: {
              players: true,
            },
          },
        },
      }),
      prisma.nPC.findUnique({
        where: { id: npcId },
      }),
    ]);

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

    if (!npc) {
      return NextResponse.json(
        { message: 'NPC bulunamadı' },
        { status: 404 }
      );
    }

    // NPC'nin bu session'a ait olduğunu kontrol et
    if (npc.sessionId !== sessionId) {
      return NextResponse.json(
        { message: 'NPC bu session\'a ait değil' },
        { status: 400 }
      );
    }

    // NPC context'i oluştur
    const npcContext = {
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      isHostile: npc.isHostile,
    };

    // Context prompt oluştur
    let contextPrompt = `**NPC:** ${npc.name}\n`;
    contextPrompt += `**Rol:** ${npc.role}\n`;
    
    if (npc.personality) {
      contextPrompt += `**Kişilik:** ${npc.personality}\n`;
    }
    
    if (npc.isHostile) {
      contextPrompt += `**Tutum:** Düşman\n`;
    } else {
      contextPrompt += `**Tutum:** Dostça/Nötr\n`;
    }

    // Son NPC mesajlarını al
    const recentMessages = await prisma.message.findMany({
      where: {
        sessionId,
        content: {
          contains: npc.name,
        },
      },
      take: 5,
      orderBy: { timestamp: 'desc' },
    });

    if (recentMessages.length > 0) {
      contextPrompt += `\n**Son Etkileşimler:**\n`;
      recentMessages.reverse().forEach((msg: any) => {
        const sender = msg.senderType === 'PLAYER' ? 'Oyuncu' : 
                      msg.senderType === 'GM' ? `${npc.name}` : msg.senderType;
        contextPrompt += `[${sender}]: ${msg.content}\n`;
      });
    }

    // User prompt oluştur
    const userPrompt = `**Oyuncu:** "${playerMessage}"\n\nBu NPC'nin kişiliğine uygun bir yanıt ver. Oyuncunun mesajına cevap ver ve hikayeyi ilerlet.`;

    // AI'dan yanıt al
    const aiResponse = await getAIResponseWithContext(
      SYSTEM_PROMPT,
      contextPrompt,
      userPrompt,
      {
        temperature: 0.9,
      }
    );

    // Oyuncu mesajını kaydet
    await prisma.message.create({
      data: {
        sessionId,
        senderType: 'PLAYER',
        content: playerMessage,
      },
    });

    // NPC yanıtını kaydet
    const npcMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'GM',
        senderName: npc.name,
        content: aiResponse,
        metadata: JSON.stringify({ npcId, isNPCDialogue: true }),
      },
    });

    // NPC diyalog geçmişini güncelle
    if (npc.dialogue) {
      const dialogueHistory = JSON.parse(npc.dialogue);
      dialogueHistory.push({
        speaker: 'player',
        content: playerMessage,
        timestamp: new Date().toISOString(),
      });
      dialogueHistory.push({
        speaker: npc.name,
        content: aiResponse,
        timestamp: new Date().toISOString(),
      });

      await prisma.nPC.update({
        where: { id: npcId },
        data: {
          dialogue: JSON.stringify(dialogueHistory),
        },
      });
    }

    return NextResponse.json({
      success: true,
      npcName: npc.name,
      dialogue: aiResponse,
      messageId: npcMessage.id,
      timestamp: npcMessage.timestamp,
    });
  } catch (error) {
    console.error('NPC dialogue error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
