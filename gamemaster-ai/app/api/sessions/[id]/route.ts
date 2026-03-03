import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/sessions/:id
 * Session detayı endpoint'i
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Auth kontrolü (NextAuth session)
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = rateLimitResponse(userId, "GET:/api/sessions/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Session'ı al
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            scenario: true,
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
                character: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { timestamp: 'desc' },
        },
        npcs: true,
        combats: true,
        maps: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // creatorId için tip assertion
    const campaignWithCreatorId = session.campaign as typeof session['campaign'] & { creatorId: string };

    // Kullanıcının yetkisi var mı? (creator veya player olabilir)
    const isCreator = campaignWithCreatorId?.creatorId === userId;
    const isPlayer = session.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Mesajları kronolojik sıraya koy ve metadata parse et
    const processedMessages = session.messages.reverse().map((msg) => {
      let gmPrompt = undefined;
      let suggestions = undefined;
      let metadata: Record<string, unknown> | undefined = undefined;

      if (msg.metadata) {
        try {
          metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
          if (metadata && metadata.gmPrompt) {
            gmPrompt = metadata.gmPrompt;
          }
          if (metadata && metadata.suggestions) {
            suggestions = metadata.suggestions;
          }
        } catch {
          // metadata parse edilemezse ignore et
        }
      }

      return {
        ...msg,
        metadata,
        gmPrompt,
        suggestions,
      };
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        campaignId: session.campaignId,
        campaign: {
          id: session.campaign.id,
          name: session.campaign.name,
          description: session.campaign.description,
          status: session.campaign.status,
          isMultiplayer: session.campaign.isMultiplayer,
          scenario: session.campaign.scenario,
          creator: session.campaign.creator,
          players: session.campaign.players,
        },
        currentState: JSON.parse(session.currentState),
        aiContext: session.aiContext,
        messages: processedMessages,
        npcs: session.npcs,
        combats: session.combats,
        maps: session.maps,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error('Session get error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/:id
 * Session güncelleme endpoint'i
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { currentState, aiContext, activePlayer } = body;

    // Auth kontrolü (NextAuth session)
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = rateLimitResponse(userId, "PUT:/api/sessions/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

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
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı? (creator veya player olabilir)
    const isCreator = session.campaign.creatorId === userId;
    const isPlayer = session.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'ı güncelleme yetkiniz yok');
    }

    // Session'ı güncelle
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (currentState !== undefined) {
      updateData.currentState = typeof currentState === 'string'
        ? currentState
        : JSON.stringify(currentState);
    }

    if (aiContext !== undefined) {
      updateData.aiContext = aiContext;
    }

    if (activePlayer !== undefined) {
      updateData.activePlayer = activePlayer;
    }

    const updatedSession = await prisma.gameSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        currentState: JSON.parse(updatedSession.currentState),
        aiContext: updatedSession.aiContext,
        activePlayer: updatedSession.activePlayer,
        updatedAt: updatedSession.updatedAt,
      },
    });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
