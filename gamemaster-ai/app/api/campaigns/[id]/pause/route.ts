import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "POST:/api/campaigns/[id]/pause", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    // Verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    if (campaign.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Yetkiniz yok' },
        { status: 403 }
      );
    }

    if (campaign.status === 'DRAFT') {
      const creatorPlayer = await prisma.campaignPlayer.findFirst({
        where: {
          campaignId,
          userId,
        },
        select: { id: true },
      });

      if (!creatorPlayer) {
        return NextResponse.json(
          { error: 'Oturumu baslatmak icin once karakter secmelisiniz' },
          { status: 400 }
        );
      }
    }

    // Update campaign status to PAUSED
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Oturum duraklatıldı',
    });
  } catch (error) {
    console.error('Pause hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
