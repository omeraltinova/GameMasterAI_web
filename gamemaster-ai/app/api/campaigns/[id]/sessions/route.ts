import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

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
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

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
        { message: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı?
    const hasAccess = campaign.creatorId === userId ||
                     campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bu oturuma erişim yetkiniz yok' },
        { status: 403 }
      );
    }

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
                email: true,
                avatar: true,
              },
            },
            scenario: true,
          },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
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
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

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
        { message: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının yetkisi var mı?
    const hasAccess = campaign.creatorId === userId ||
                     campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bu oturuma erişim yetkiniz yok' },
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
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
