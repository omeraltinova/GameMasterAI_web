import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

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

        const { id: sessionId } = await params;
        const body = await req.json();
        const { name, race, role, personality, stats, isHostile, imageUrl } = body;

        // Validation
        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'NPC adı gerekiyor' },
                { status: 400 }
            );
        }

        if (!role || typeof role !== 'string') {
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

        // Erişim kontrolü (sadece creator ve oyuncular)
        const hasAccess = session.campaign.creatorId === userId ||
            session.campaign.players.some((p: any) => p.userId === userId);

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // NPC oluştur
        const npc = await prisma.nPC.create({
            data: {
                sessionId,
                name,
                race: race || null,
                role,
                personality: personality || null,
                stats: stats ? JSON.stringify(stats) : null,
                isHostile: isHostile || false,
                imageUrl: imageUrl || null,
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
