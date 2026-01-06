import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

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
                quantity: quantity || 1,
                properties: properties ? JSON.stringify(properties) : null,
                weight: weight || 0,
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
