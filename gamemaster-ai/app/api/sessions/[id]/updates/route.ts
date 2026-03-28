import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

const MAX_MESSAGES_PER_POLL = 20;

/**
 * GET /api/sessions/:id/updates
 * Son güncellemeler (polling) endpoint'i
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');

    // Auth kontrolü (NextAuth session)
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = rateLimitResponse(userId, "GET:/api/sessions/[id]/updates", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

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

    const actorRole = getCampaignActorRole(session.campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Since parametresini parse et
    let since: Date | null = null;
    if (sinceParam) {
      const parsedSince = new Date(sinceParam);
      if (!Number.isNaN(parsedSince.getTime())) {
        since = parsedSince;
      } else {
        since = null;
      }
    }

    // Güncellemeleri al
    const whereClause: Prisma.MessageWhereInput = {
      sessionId,
      isSoftDeleted: false,
    };

    if (since) {
      whereClause.timestamp = {
        gte: since,
      };
    }

    // Son güncellemeleri al (son 20 tane)
    const updates = await prisma.message.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: MAX_MESSAGES_PER_POLL,
    });

    const sanitizedUpdates = updates.map((msg) => {
      let gmPrompt: unknown = undefined;
      let suggestions: unknown = undefined;
      if (msg.metadata) {
        try {
          const parsed = JSON.parse(msg.metadata);
          if (parsed && typeof parsed === 'object') {
            gmPrompt = (parsed as { gmPrompt?: unknown }).gmPrompt;
            suggestions = (parsed as { suggestions?: unknown }).suggestions;
          }
        } catch {
          gmPrompt = undefined;
        }
      }

      const metadata: Record<string, unknown> = {};
      if (gmPrompt) metadata.gmPrompt = gmPrompt;
      if (suggestions) metadata.suggestions = suggestions;

      return {
        ...msg,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        gmPrompt,
        suggestions,
        locationImageUrl: msg.locationImageUrl,
        locationName: msg.locationName,
      };
    });

    // Session güncelleme zamanını kontrol et
    const lastUpdate = session.updatedAt;

    // Game state değişti mi?
    const gameStateChanged = since ? lastUpdate > since : true;

    return NextResponse.json({
      success: true,
      updates: {
        hasNewMessages: sanitizedUpdates.length > 0,
        messages: sanitizedUpdates,
        gameStateChanged,
        lastUpdate: lastUpdate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Updates get error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
