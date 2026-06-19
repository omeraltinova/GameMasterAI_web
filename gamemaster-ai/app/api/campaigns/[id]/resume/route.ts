import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

// POST /api/campaigns/:id/resume - Oturumu devam ettir (PAUSED → ACTIVE)
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

        const limited = await rateLimitResponse(userId, "POST:/api/campaigns/[id]/resume", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

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

        // Sadece kurucu devam ettirebilir
        if (campaign.creatorId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        // Sadece PAUSED oturum devam ettirilebilir
        if (campaign.status !== 'PAUSED') {
            return NextResponse.json(
                { success: false, error: 'Sadece duraklatılmış oturumlar devam ettirilebilir' },
                { status: 400 }
            );
        }

        // Oturumu ACTIVE yap
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE' },
        });

        return NextResponse.json({
            success: true,
            message: 'Oturum devam ettiriliyor',
        });
    } catch (error) {
        console.error('Resume campaign error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
