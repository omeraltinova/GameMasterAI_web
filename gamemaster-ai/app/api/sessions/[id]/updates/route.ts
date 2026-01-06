import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';

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

    // Kullanıcının yetkisi var mı?
    const hasAccess = session.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!hasAccess) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Since parametresini parse et
    let since: Date | null = null;
    if (sinceParam) {
      try {
        since = new Date(sinceParam);
      } catch (error) {
        console.error('Invalid since parameter:', error);
        since = null;
      }
    }

    // Güncellemeleri al
    const whereClause: any = { sessionId };

    if (since) {
      whereClause.timestamp = {
        gte: since,
      };
    }

    // Son güncellemeleri al (son 20 tane)
    const updates = await prisma.message.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Session güncelleme zamanını kontrol et
    const lastUpdate = session.updatedAt;

    // Game state değişti mi?
    const gameStateChanged = since ? lastUpdate > since : true;

    return NextResponse.json({
      success: true,
      updates: {
        hasNewMessages: updates.length > 0,
        messages: updates,
        gameStateChanged,
        lastUpdate: lastUpdate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Updates get error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
