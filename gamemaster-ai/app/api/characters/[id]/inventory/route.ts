import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';
import { ITEM_TYPES, isAllowedItemType } from '@/lib/game/items';

const MIN_ITEM_QUANTITY = 1;
const MAX_ITEM_QUANTITY = 999;
const MIN_ITEM_WEIGHT = 0;
const MAX_ITEM_WEIGHT = 1000;

/**
 * GET /api/characters/:id/inventory
 * Karakter envanterini getir
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

        const limited = await rateLimitResponse(userId, "GET:/api/characters/[id]/inventory", RATE_LIMIT_TIERS.READ);
        if (limited) return limited;

        const { id: characterId } = await params;

        // Karakter kontrolü
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { userId: true },
        });

        if (!character) {
            return NextResponse.json(
                { success: false, error: 'Karakter bulunamadı' },
                { status: 404 }
            );
        }

        // Sadece kendi karakterinin envanterini görebilir
        if (character.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu karaktere erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // Envanter öğelerini getir
        const items = await prisma.inventoryItem.findMany({
            where: { characterId },
            orderBy: [
                { equipped: 'desc' },
                { type: 'asc' },
                { name: 'asc' },
            ],
        });

        // Toplam ağırlık hesapla
        const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

        // Kuşanılmış eşyaları ayır
        const equipped = items.filter(item => item.equipped);
        const inventory = items.filter(item => !item.equipped);

        return NextResponse.json({
            success: true,
            items,
            equipped,
            inventory,
            totalWeight: Math.round(totalWeight * 10) / 10,
            itemCount: items.length,
        });
    } catch (error) {
        console.error('Inventory get error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/characters/:id/inventory
 * Envantere yeni item ekle
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

        const limited = await rateLimitResponse(userId, "POST:/api/characters/[id]/inventory", RATE_LIMIT_TIERS.WRITE);
        if (limited) return limited;

        const { id: characterId } = await params;
        const body = await req.json();
        const { name, type, description, quantity, properties, weight } = body;

        // Validasyon
        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Item adı gerekiyor' },
                { status: 400 }
            );
        }

        if (!type || typeof type !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Item tipi gerekiyor' },
                { status: 400 }
            );
        }

        if (!isAllowedItemType(type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Geçersiz item tipi. İzin verilenler: ${ITEM_TYPES.join(', ')}`,
                },
                { status: 400 }
            );
        }

        const parsedQuantity =
            quantity === undefined || quantity === null ? MIN_ITEM_QUANTITY : Number(quantity);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < MIN_ITEM_QUANTITY || parsedQuantity > MAX_ITEM_QUANTITY) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Item adedi ${MIN_ITEM_QUANTITY}-${MAX_ITEM_QUANTITY} arasında tam sayı olmalı`,
                },
                { status: 400 }
            );
        }

        const parsedWeight =
            weight === undefined || weight === null ? MIN_ITEM_WEIGHT : Number(weight);
        if (!Number.isFinite(parsedWeight) || parsedWeight < MIN_ITEM_WEIGHT || parsedWeight > MAX_ITEM_WEIGHT) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Item ağırlığı ${MIN_ITEM_WEIGHT}-${MAX_ITEM_WEIGHT} arasında olmalı`,
                },
                { status: 400 }
            );
        }

        // Karakter kontrolü
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { userId: true },
        });

        if (!character) {
            return NextResponse.json(
                { success: false, error: 'Karakter bulunamadı' },
                { status: 404 }
            );
        }

        if (character.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Bu karaktere erişim yetkiniz yok' },
                { status: 403 }
            );
        }

        // Item oluştur
        const item = await prisma.inventoryItem.create({
            data: {
                characterId,
                name,
                type,
                description: description || null,
                quantity: parsedQuantity,
                properties: properties ? JSON.stringify(properties) : null,
                weight: parsedWeight,
                equipped: false,
            },
        });

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                properties: item.properties ? JSON.parse(item.properties) : null,
            },
            message: 'Item eklendi',
        });
    } catch (error) {
        console.error('Inventory add error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu' },
            { status: 500 }
        );
    }
}
