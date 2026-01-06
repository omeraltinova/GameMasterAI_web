import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

/**
 * GET /api/sessions/:id/dice-history
 * Session için zar geçmişini getir
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

        const { id: sessionId } = await params;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const characterId = searchParams.get('characterId');

        // Session kontrolü
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
                { success: false, error: 'Session bulunamadı' },
                { status: 404 }
            );
        }

        // Erişim kontrolü
        const hasAccess = session.campaign.creatorId === userId ||
            session.campaign.players.some((p: any) => p.userId === userId);

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // Zar geçmişini getir
        const whereClause: any = { sessionId };
        if (characterId) {
            whereClause.characterId = characterId;
        }

        const diceRolls = await prisma.diceRoll.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: Math.min(limit, 100), // Max 100
            include: {
                character: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // İstatistikleri hesapla
        const allRolls = await prisma.diceRoll.findMany({
            where: { sessionId },
            select: {
                diceType: true,
                results: true,
                total: true,
            },
        });

        const stats = {
            totalRolls: allRolls.length,
            d20Rolls: allRolls.filter(r => r.diceType === 'd20').length,
            criticalSuccesses: 0,
            criticalFailures: 0,
            averageD20: 0,
        };

        // d20 istatistikleri
        const d20Rolls = allRolls.filter(r => r.diceType === 'd20');
        if (d20Rolls.length > 0) {
            let d20Sum = 0;
            d20Rolls.forEach(roll => {
                const results = JSON.parse(roll.results);
                results.forEach((r: number) => {
                    d20Sum += r;
                    if (r === 20) stats.criticalSuccesses++;
                    if (r === 1) stats.criticalFailures++;
                });
            });
            stats.averageD20 = Math.round((d20Sum / d20Rolls.length) * 10) / 10;
        }

        return NextResponse.json({
            success: true,
            rolls: diceRolls.map(roll => ({
                id: roll.id,
                diceType: roll.diceType,
                count: roll.count,
                results: JSON.parse(roll.results),
                modifier: roll.modifier,
                total: roll.total,
                purpose: roll.purpose,
                character: roll.character,
                timestamp: roll.timestamp,
            })),
            stats,
        });
    } catch (error) {
        console.error('Dice history error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
