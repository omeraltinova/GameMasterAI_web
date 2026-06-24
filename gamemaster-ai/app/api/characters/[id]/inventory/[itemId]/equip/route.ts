import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';
import { EQUIPPABLE_TYPES, isEquippableType, maxEquippedForType } from '@/lib/game/items';

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

        // Toggle equipped status
        const newEquipped = equipped !== undefined ? equipped : !existingItem.equipped;

        if (newEquipped && !isEquippableType(existingItem.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Bu item kuşanılamaz. Kuşanılabilir tipler: ${EQUIPPABLE_TYPES.join(', ')}`,
                },
                { status: 400 }
            );
        }

        let item;
        if (newEquipped) {
            // Slot-occupancy enforcement: only a bounded number of items of a given
            // type may be equipped at once (e.g. one body armor, two rings). If
            // equipping this item would exceed the limit, unequip the oldest
            // conflicting item(s) so the slot can never silently hold extras.
            const limit = maxEquippedForType(existingItem.type);
            item = await prisma.$transaction(async (tx) => {
                const sameTypeEquipped = await tx.inventoryItem.findMany({
                    where: {
                        characterId,
                        type: existingItem.type,
                        equipped: true,
                        NOT: { id: itemId },
                    },
                    orderBy: { id: 'asc' },
                    select: { id: true },
                });

                const keep = Math.max(0, limit - 1);
                const toUnequip = sameTypeEquipped.slice(
                    0,
                    Math.max(0, sameTypeEquipped.length - keep),
                );

                if (toUnequip.length > 0) {
                    await tx.inventoryItem.updateMany({
                        where: { id: { in: toUnequip.map((i) => i.id) } },
                        data: { equipped: false },
                    });
                }

                return tx.inventoryItem.update({
                    where: { id: itemId },
                    data: { equipped: true },
                });
            });
        } else {
            item = await prisma.inventoryItem.update({
                where: { id: itemId },
                data: { equipped: false },
            });
        }

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
