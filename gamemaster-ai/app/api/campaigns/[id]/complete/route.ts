import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

// POST /api/campaigns/:id/complete - Oturumu tamamla
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

        // Oturumu bul
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            return NextResponse.json(
                { success: false, error: 'Oturum bulunamadı' },
                { status: 404 }
            );
        }

        // Sadece kurucu tamamlayabilir
        if (campaign.creatorId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        // Zaten tamamlanmış mı kontrol et
        if (campaign.status === 'COMPLETED') {
            return NextResponse.json(
                { success: false, error: 'Oturum zaten tamamlandı' },
                { status: 400 }
            );
        }

        // Oturumu COMPLETED yap
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED' },
        });

        return NextResponse.json({
            success: true,
            message: 'Oturum tamamlandı',
        });
    } catch (error) {
        console.error('Complete campaign error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
