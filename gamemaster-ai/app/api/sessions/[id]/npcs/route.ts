import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';
import { normalizeImageUrl } from '@/lib/security/imageUrl';
import { sanitizeNpcCombatStats } from '@/lib/combat/utils';

const MAX_NPC_TEXT_LENGTH = 80;
const MAX_NPC_PERSONALITY_LENGTH = 500;

/**
 * GET /api/sessions/:id/npcs
 * Session'daki tüm NPC'leri getir
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

        const limited = await rateLimitResponse(userId, "GET:/api/sessions/[id]/npcs", RATE_LIMIT_TIERS.READ);
        if (limited) return limited;

        const { id: sessionId } = await params;

        // Session kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                campaign: {
                    include: { players: true },
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

        // NPC'leri getir
        const npcs = await prisma.nPC.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            npcs: npcs.map(npc => ({
                ...npc,
                stats: npc.stats ? JSON.parse(npc.stats) : null,
                dialogue: npc.dialogue ? JSON.parse(npc.dialogue) : [],
            })),
        });
    } catch (error) {
        console.error('NPC list error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/sessions/:id/npcs
 * Yeni NPC oluştur
 */
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

        const limited = await rateLimitResponse(userId, "POST:/api/sessions/[id]/npcs", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

        const { id: sessionId } = await params;
        const body = await req.json();
        const { name, race, role, personality, stats, isHostile, imageUrl } = body;

        let normalizedImageUrl: string | null = null;
        if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
            if (typeof imageUrl !== 'string') {
                return NextResponse.json(
                    { success: false, error: 'Geçersiz görsel URL' },
                    { status: 400 }
                );
            }

            const safeImageUrl = normalizeImageUrl(imageUrl);
            if (!safeImageUrl) {
                return NextResponse.json(
                    { success: false, error: 'Geçersiz görsel URL' },
                    { status: 400 }
                );
            }
            normalizedImageUrl = safeImageUrl;
        }

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'NPC adı gerekiyor' },
                { status: 400 }
            );
        }

        if (!role || typeof role !== 'string' || role.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'NPC rolü gerekiyor' },
                { status: 400 }
            );
        }

        // Session kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                campaign: {
                    include: { players: true },
                },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session bulunamadı' },
                { status: 404 }
            );
        }

        // Erişim kontrolü: NPC yönetimi (yaratımı dahil) yalnızca Game Master'a aittir.
        // NPC'ler savaş başlangıcında düşman olarak motora beslendiği için, herhangi bir
        // oyuncunun keyfi statlı NPC enjekte etmesi oyun dengesini bozardı.
        const actorRole = getCampaignActorRole(session.campaign, userId);
        if (!hasCampaignAccess(actorRole)) {
            return NextResponse.json(
                { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
                { status: 403 }
            );
        }
        if (!canManageCampaign(actorRole)) {
            return NextResponse.json(
                { success: false, error: 'Sadece Game Master NPC oluşturabilir' },
                { status: 403 }
            );
        }

        // Statlar güvene alınmadan (hp/maxHp/ac sınırları) saklanmaz.
        const sanitizedStats = sanitizeNpcCombatStats(stats);

        // NPC oluştur
        const npc = await prisma.nPC.create({
            data: {
                sessionId,
                name: name.trim().slice(0, MAX_NPC_TEXT_LENGTH),
                race: typeof race === 'string' && race.trim().length > 0
                    ? race.trim().slice(0, MAX_NPC_TEXT_LENGTH)
                    : null,
                role: role.trim().slice(0, MAX_NPC_TEXT_LENGTH),
                personality: typeof personality === 'string' && personality.trim().length > 0
                    ? personality.trim().slice(0, MAX_NPC_PERSONALITY_LENGTH)
                    : null,
                stats: sanitizedStats ? JSON.stringify(sanitizedStats) : null,
                isHostile: isHostile === true,
                imageUrl: normalizedImageUrl,
                dialogue: JSON.stringify([]),
            },
        });

        return NextResponse.json({
            success: true,
            npc: {
                ...npc,
                stats: npc.stats ? JSON.parse(npc.stats) : null,
                dialogue: [],
            },
            message: 'NPC oluşturuldu',
        });
    } catch (error) {
        console.error('NPC create error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
