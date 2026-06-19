import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * PUT /api/characters/:id/inventory/:itemId/equip
 * Item kuşan veya çıkar
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Oturum açmanız gerekiyor' },
                { status: 401 }
            );
        }

        const limited = await rateLimitResponse(userId, "PUT:/api/characters/[id]/inventory/[itemId]/equip", RATE_LIMIT_TIERS.GAME_ACTION);
        if (limited) return limited;

        const { id: characterId, itemId } = await params;
        const body = await req.json();
        const { equipped } = body;

        // Karakter kontrolü
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { userId: true },
        });

        if (!character || character.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // Item kontrolü
        const existingItem = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
        });

        if (!existingItem || existingItem.characterId !== characterId) {
            return NextResponse.json(
                { success: false, error: 'Item bulunamadı' },
                { status: 404 }
            );
        }

        // Kuşanılabilir tipler
        const equippableTypes = ['Weapon', 'Armor', 'Shield', 'Accessory', 'Ring', 'Amulet', 'Helmet', 'Boots', 'Gloves', 'Cloak'];

        if (equipped && !equippableTypes.includes(existingItem.type)) {
            return NextResponse.json(
                { success: false, error: 'Bu item kuşanılamaz' },
                { status: 400 }
            );
        }

        // Toggle equipped status
        const newEquipped = equipped !== undefined ? equipped : !existingItem.equipped;

        const item = await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { equipped: newEquipped },
        });

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                properties: item.properties ? JSON.parse(item.properties) : null,
            },
            message: newEquipped ? 'Item kuşanıldı' : 'Item çıkarıldı',
        });
    } catch (error) {
        console.error('Item equip error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
