import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

// POST /api/campaigns/:id/resume - Kampanyayı devam ettir (PAUSED → ACTIVE)
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

        // Sadece kurucu devam ettirebilir
        if (campaign.creatorId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        // Sadece PAUSED kampanya devam ettirilebilir
        if (campaign.status !== 'PAUSED') {
            return NextResponse.json(
                { success: false, error: 'Sadece duraklatılmış kampanyalar devam ettirilebilir' },
                { status: 400 }
            );
        }

        // Kampanyayı ACTIVE yap
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE' },
        });

        return NextResponse.json({
            success: true,
            message: 'Kampanya devam ettiriliyor',
        });
    } catch (error) {
        console.error('Resume campaign error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
