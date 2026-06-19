import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/campaigns/:id/sessions
 * Campaign'ın session'larını listeleme endpoint'i
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = await rateLimitResponse(userId, "GET:/api/campaigns/[id]/sessions", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id: campaignId } = await params;
    
    // Campaign'ı kontrol et
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        creatorId: true,
        isSoftDeleted: true,
        players: true,
      },
    });

    if (!campaign || campaign.isSoftDeleted) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı?
    const actorRole = getCampaignActorRole(campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return NextResponse.json(
        { success: false, error: 'Bu oturuma erişim yetkiniz yok' },
        { status: 403 }
      );
    }
    const shouldExposeInviteCode = canManageCampaign(actorRole);

    // Session'ları listele
    const sessions = await prisma.gameSession.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            scenario: true,
          },
        },
      },
    });

    return NextResponse.json(
      sessions.map((session: any) => ({
        ...session,
        campaign: session.campaign
          ? {
              ...session.campaign,
              inviteCode:
                shouldExposeInviteCode && session.campaign.isMultiplayer
                  ? session.campaign.inviteCode
                  : null,
              creator: session.campaign.creator
                ? {
                    id: session.campaign.creator.id,
                    username: session.campaign.creator.username,
                    avatar: session.campaign.creator.avatar,
                  }
                : null,
            }
          : null,
      }))
    );
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/:id/sessions
 * Yeni session başlatma endpoint'i
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = await rateLimitResponse(userId, "POST:/api/campaigns/[id]/sessions", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id: campaignId } = await params;
    
    // Campaign'ı kontrol et
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: true,
        players: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı?
    const actorRole = getCampaignActorRole(campaign, userId);
    if (!canManageCampaign(actorRole)) {
      return NextResponse.json(
        { success: false, error: 'Sadece Game Master yeni session başlatabilir' },
        { status: 403 }
      );
    }

    // Yeni session oluştur
    const session = await prisma.gameSession.create({
      data: {
        campaignId,
        currentState: JSON.stringify({
          location: 'Başlangıç',
          timeOfDay: 'gündüz',
          weather: 'açık',
          inCombat: false,
          activeQuests: [],
          notes: 'Oyun başladı',
        }),
        aiContext: 'Yeni session',
      },
    });

    // Campaign durumunu güncelle
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    // Başlangıç mesajı ekle
    await prisma.message.create({
      data: {
        sessionId: session.id,
        senderType: 'SYSTEM',
        content: `🎮 Oyun başladı! ${campaign.name} oturumuna hoş geldiniz.`,
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        campaignId: session.campaignId,
        currentState: JSON.parse(session.currentState),
        createdAt: session.createdAt,
      },
      message: 'Session başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
