import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';

/**
 * GET /api/sessions/:id/messages
 * Mesaj geçmişi endpoint'i
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Auth kontrolü (NextAuth session)
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Session'ı kontrol et
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
            players: {
              select: {
                userId: true,
              },
            },
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

    // Kullanıcının yetkisi var mı? (creator veya player olabilir)
    const isCreator = session.campaign.creatorId === userId;
    const isPlayer = session.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Mesajları al
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    // Toplam mesaj sayısı
    const totalCount = await prisma.message.count({
      where: { sessionId },
    });

    // Mesajları işle - metadata'dan gmPrompt'u çıkar
    const processedMessages = messages.map((msg) => {
      let gmPrompt = undefined;
      if (msg.metadata) {
        try {
          const metadata = JSON.parse(msg.metadata);
          if (metadata.gmPrompt) {
            gmPrompt = metadata.gmPrompt;
          }
        } catch (e) {
          // metadata parse edilemezse ignore et
        }
      }
      return {
        ...msg,
        gmPrompt,
      };
    });

    return NextResponse.json({
      success: true,
      messages: processedMessages.reverse(), // Kronolojik sıraya koy
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Messages get error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/:id/messages
 * Mesaj gönderme endpoint'i
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { content, senderType } = body;

    // Validation
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { message: 'Mesaj içeriği gerekiyor' },
        { status: 400 }
      );
    }

    if (!senderType || typeof senderType !== 'string') {
      return NextResponse.json(
        { message: 'Gönderen tipi gerekiyor' },
        { status: 400 }
      );
    }

    // Auth kontrolü (NextAuth session)
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Session'ı kontrol et (karakter bilgisi için players'ı dahil et)
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
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

    if (!session) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı? (creator veya player olabilir)
    const isCreator = session.campaign.creatorId === userId;
    const currentPlayer = session.campaign.players.find(
      (player: any) => player.userId === userId
    );
    const isPlayer = !!currentPlayer;

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a mesaj gönderme yetkiniz yok');
    }

    // Oyuncunun karakter veya kullanıcı adını al
    const senderName = currentPlayer?.character?.name || 
                       currentPlayer?.user?.username || 
                       'Oyuncu';

    // Mesaj oluştur
    const message = await prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        senderType: senderType || 'PLAYER',
        senderName,
        content,
        timestamp: new Date(),
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
      message: {
        id: message.id,
        sessionId: message.sessionId,
        senderId: message.senderId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
      },
    });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
