import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

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

    const { id: campaignId } = await params;

    // Kampanyayı bul
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Kampanya bulunamadı' },
        { status: 404 }
      );
    }

    // Sadece kurucu yeni kod oluşturabilir
    if (campaign.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // Yeni benzersiz davet kodu oluştur
    const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Kampanyayı güncelle
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
