import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 50;
const STATS_D20_SAMPLE_LIMIT = 500;

function parsePositiveInt(value: string | null, fallback: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

function parseDiceResults(results: string) {
    try {
        const parsed = JSON.parse(results) as unknown;
        return Array.isArray(parsed)
            ? parsed.filter((entry): entry is number => Number.isFinite(entry))
            : [];
    } catch {
        return [];
    }
}

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

        const limited = rateLimitResponse(userId, "GET:/api/sessions/[id]/dice-history", RATE_LIMIT_TIERS.READ);
        if (limited) return limited;

        const { id: sessionId } = await params;
        const { searchParams } = new URL(req.url);
        const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_HISTORY_LIMIT);
        const limit = Math.min(requestedLimit, MAX_HISTORY_LIMIT);
        const characterId = searchParams.get('characterId');

        // Session kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            select: {
                campaign: {
                    select: {
                        creatorId: true,
                        players: {
                            select: {
                                userId: true,
                            },
                        },
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
        const whereClause: { sessionId: string; characterId?: string } = { sessionId };
        if (characterId) {
            whereClause.characterId = characterId;
        }

        const [diceRolls, totalRolls, d20Rolls, d20Sample] = await Promise.all([
            prisma.diceRoll.findMany({
                where: whereClause,
                orderBy: { timestamp: 'desc' },
                take: limit,
                include: {
                    character: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            prisma.diceRoll.count({
                where: { sessionId },
            }),
            prisma.diceRoll.count({
                where: { sessionId, diceType: 'd20' },
            }),
            prisma.diceRoll.findMany({
                where: { sessionId, diceType: 'd20' },
                select: {
                    results: true,
                },
                orderBy: { timestamp: 'desc' },
                take: STATS_D20_SAMPLE_LIMIT,
            }),
        ]);

        // İstatistikleri hesapla (d20 için örneklem sınırı uygulanır).
        let criticalSuccesses = 0;
        let criticalFailures = 0;
        let d20Sum = 0;
        let d20ResultCount = 0;

        d20Sample.forEach((roll) => {
            const parsedResults = parseDiceResults(roll.results);
            parsedResults.forEach((result) => {
                d20Sum += result;
                d20ResultCount += 1;
                if (result === 20) criticalSuccesses += 1;
                if (result === 1) criticalFailures += 1;
            });
        });

        const stats = {
            totalRolls,
            d20Rolls,
            criticalSuccesses,
            criticalFailures,
            averageD20: d20ResultCount > 0
                ? Math.round((d20Sum / d20ResultCount) * 10) / 10
                : 0,
            sampledD20Rolls: d20Sample.length,
        };

        return NextResponse.json({
            success: true,
            rolls: diceRolls.map(roll => ({
                id: roll.id,
                diceType: roll.diceType,
                count: roll.count,
                results: parseDiceResults(roll.results),
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
