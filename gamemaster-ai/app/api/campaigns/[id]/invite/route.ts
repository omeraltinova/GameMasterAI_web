import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { randomBytes } from 'crypto';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

// POST /api/campaigns/:id/invite - Yeni davet kodu oluştur
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

    const limited = await rateLimitResponse(userId, "POST:/api/campaigns/[id]/invite", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id: campaignId } = await params;

    // Oturumu bul
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.isSoftDeleted) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    if (!campaign.isMultiplayer) {
      return NextResponse.json(
        { success: false, error: 'Solo oturumlarda davet kodu kullanılamaz' },
        { status: 400 }
      );
    }

    // Sadece kurucu yeni kod oluşturabilir
    if (campaign.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // Yeni benzersiz davet kodu oluştur (72-bit entropy)
    const newInviteCode = randomBytes(9).toString('hex').toUpperCase();

    // Oturumu güncelle
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { inviteCode: newInviteCode },
    });

    return NextResponse.json({
      success: true,
      inviteCode: updatedCampaign.inviteCode,
      message: 'Yeni davet kodu oluşturuldu',
    });
  } catch (error) {
    console.error('Invite code refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
