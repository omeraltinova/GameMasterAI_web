import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/sessions/:id/state
 * Oyun durumu (polling) endpoint'i
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

    const limited = await rateLimitResponse(userId, "GET:/api/sessions/[id]/state", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Session'ı al
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        campaignId: true,
        currentState: true,
        turnOrder: true,
        activePlayer: true,
        updatedAt: true,
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

    const actorRole = getCampaignActorRole(session.campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Game state'i parse et
    const gameState = JSON.parse(session.currentState || '{}');

    return NextResponse.json({
      success: true,
      state: {
        sessionId: session.id,
        campaignId: session.campaignId,
        location: gameState.location,
        timeOfDay: gameState.timeOfDay,
        weather: gameState.weather,
        inCombat: gameState.inCombat,
        activeQuests: gameState.activeQuests || [],
        notes: gameState.notes,
        activeNPCs: gameState.activeNPCs || [],
        turnOrder: session.turnOrder ? JSON.parse(session.turnOrder) : null,
        activePlayer: session.activePlayer,
      },
      timestamp: session.updatedAt,
    });
  } catch (error) {
    console.error('Session state get error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
