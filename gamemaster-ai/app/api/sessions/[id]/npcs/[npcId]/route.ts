import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

/**
 * GET /api/sessions/:id/npcs/:npcId
 * Tek bir NPC getir
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; npcId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Oturum açmanız gerekiyor' },
                { status: 401 }
            );
        }

        const { id: sessionId, npcId } = await params;

        // Session ve erişim kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                campaign: { include: { players: true } },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session bulunamadı' },
                { status: 404 }
            );
        }

        const hasAccess = session.campaign.creatorId === userId ||
            session.campaign.players.some((p: any) => p.userId === userId);

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        const npc = await prisma.nPC.findUnique({
            where: { id: npcId },
        });

        if (!npc || npc.sessionId !== sessionId) {
            return NextResponse.json(
                { success: false, error: 'NPC bulunamadı' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            npc: {
                ...npc,
                stats: npc.stats ? JSON.parse(npc.stats) : null,
                dialogue: npc.dialogue ? JSON.parse(npc.dialogue) : [],
            },
        });
    } catch (error) {
        console.error('NPC get error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/sessions/:id/npcs/:npcId
 * NPC güncelle
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; npcId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Oturum açmanız gerekiyor' },
                { status: 401 }
            );
        }

        const { id: sessionId, npcId } = await params;
        const body = await req.json();
        const { name, race, role, personality, stats, isHostile, imageUrl, dialogue } = body;

        // Session ve erişim kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                campaign: { include: { players: true } },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session bulunamadı' },
                { status: 404 }
            );
        }

        const hasAccess = session.campaign.creatorId === userId ||
            session.campaign.players.some((p: any) => p.userId === userId);

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: 'Erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // NPC kontrolü
        const existingNpc = await prisma.nPC.findUnique({
            where: { id: npcId },
        });

        if (!existingNpc || existingNpc.sessionId !== sessionId) {
            return NextResponse.json(
                { success: false, error: 'NPC bulunamadı' },
                { status: 404 }
            );
        }

        // Güncelle
        const npc = await prisma.nPC.update({
            where: { id: npcId },
            data: {
                name: name ?? existingNpc.name,
                race: race !== undefined ? race : existingNpc.race,
                role: role ?? existingNpc.role,
                personality: personality !== undefined ? personality : existingNpc.personality,
                stats: stats !== undefined ? (stats ? JSON.stringify(stats) : null) : existingNpc.stats,
                isHostile: isHostile ?? existingNpc.isHostile,
                imageUrl: imageUrl !== undefined ? imageUrl : existingNpc.imageUrl,
                dialogue: dialogue !== undefined ? JSON.stringify(dialogue) : existingNpc.dialogue,
            },
        });

        return NextResponse.json({
            success: true,
            npc: {
                ...npc,
                stats: npc.stats ? JSON.parse(npc.stats) : null,
                dialogue: npc.dialogue ? JSON.parse(npc.dialogue) : [],
            },
            message: 'NPC güncellendi',
        });
    } catch (error) {
        console.error('NPC update error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/sessions/:id/npcs/:npcId
 * NPC sil
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; npcId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Oturum açmanız gerekiyor' },
                { status: 401 }
            );
        }

        const { id: sessionId, npcId } = await params;

        // Session ve erişim kontrolü
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                campaign: { include: { players: true } },
            },
        });

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session bulunamadı' },
                { status: 404 }
            );
        }

        // Sadece creator silebilir
        if (session.campaign.creatorId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Sadece kampanya sahibi NPC silebilir' },
                { status: 403 }
            );
        }

        // NPC kontrolü
        const existingNpc = await prisma.nPC.findUnique({
            where: { id: npcId },
        });

        if (!existingNpc || existingNpc.sessionId !== sessionId) {
            return NextResponse.json(
                { success: false, error: 'NPC bulunamadı' },
                { status: 404 }
            );
        }

        // Sil
        await prisma.nPC.delete({
            where: { id: npcId },
        });

        return NextResponse.json({
            success: true,
            message: 'NPC silindi',
        });
    } catch (error) {
        console.error('NPC delete error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
