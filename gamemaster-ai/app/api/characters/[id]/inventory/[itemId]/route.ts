import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/characters/:id/inventory/:itemId
 * Tek bir item'ı getir
 */
export async function GET(
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

        const limited = rateLimitResponse(userId, "GET:/api/characters/[id]/inventory/[itemId]", RATE_LIMIT_TIERS.READ);
        if (limited) return limited;

        const { id: characterId, itemId } = await params;

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

        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
        });

        if (!item || item.characterId !== characterId) {
            return NextResponse.json(
                { success: false, error: 'Item bulunamadı' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                properties: item.properties ? JSON.parse(item.properties) : null,
            },
        });
    } catch (error) {
        console.error('Item get error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/characters/:id/inventory/:itemId
 * Item güncelle
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

        const limited = rateLimitResponse(userId, "PUT:/api/characters/[id]/inventory/[itemId]", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

        const { id: characterId, itemId } = await params;
        const body = await req.json();
        const { name, type, description, quantity, properties, weight, equipped } = body;

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

        // Güncelle
        const item = await prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
                name: name ?? existingItem.name,
                type: type ?? existingItem.type,
                description: description !== undefined ? description : existingItem.description,
                quantity: quantity ?? existingItem.quantity,
                properties: properties !== undefined
                    ? (properties ? JSON.stringify(properties) : null)
                    : existingItem.properties,
                weight: weight ?? existingItem.weight,
                equipped: equipped ?? existingItem.equipped,
            },
        });

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                properties: item.properties ? JSON.parse(item.properties) : null,
            },
            message: 'Item güncellendi',
        });
    } catch (error) {
        console.error('Item update error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/characters/:id/inventory/:itemId
 * Item sil
 */
export async function DELETE(
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

        const limited = rateLimitResponse(userId, "DELETE:/api/characters/[id]/inventory/[itemId]", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

        const { id: characterId, itemId } = await params;

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

        // Sil
        await prisma.inventoryItem.delete({
            where: { id: itemId },
        });

        return NextResponse.json({
            success: true,
            message: 'Item silindi',
        });
    } catch (error) {
        console.error('Item delete error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
