import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

// DELETE /api/campaigns/:id/players/:playerId - Oyuncuyu at
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; playerId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Oturum açmanız gerekiyor' },
                { status: 401 }
            );
        }

        const limited = rateLimitResponse(userId, "DELETE:/api/campaigns/[id]/players", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

        const { id: campaignId, playerId } = await params;

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

        // Sadece kurucu oyuncu atabilir
        if (campaign.creatorId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            );
        }

        // Player kaydını bul
        const player = await prisma.campaignPlayer.findUnique({
            where: { id: playerId },
            include: { character: true },
        });

        if (!player) {
            return NextResponse.json(
                { success: false, error: 'Oyuncu bulunamadı' },
                { status: 404 }
            );
        }

        // Oturum kurucusunu atamazsın
        if (player.userId === campaign.creatorId) {
            return NextResponse.json(
                { success: false, error: 'Oturum kurucusunu atamazsınız' },
                { status: 400 }
            );
        }

        // Karakterin campaignId'sini temizle
        if (player.characterId) {
            await prisma.character.update({
                where: { id: player.characterId },
                data: { campaignId: null },
            });
        }

        // Player kaydını sil
        await prisma.campaignPlayer.delete({
            where: { id: playerId },
        });

        return NextResponse.json({
            success: true,
            message: 'Oyuncu oturumdan çıkarıldı',
        });
    } catch (error) {
        console.error('Kick player error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
