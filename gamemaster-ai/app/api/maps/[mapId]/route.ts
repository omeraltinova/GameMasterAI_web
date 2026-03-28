import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/maps/:mapId
 * Tek bir haritayı getir
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Haritayı bul
    const map = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        session: {
          include: {
            campaign: {
              select: {
                creatorId: true,
                players: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!map) {
      return NextResponse.json(
        { success: false, message: 'Harita bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = map.session.campaign.creatorId === userId;
    const isPlayer = map.session.campaign.players.some(p => p.userId === userId);

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu haritaya erişim yetkiniz yok');
    }

    return NextResponse.json({
      success: true,
      map: {
        id: map.id,
        sessionId: map.sessionId,
        name: map.name,
        description: map.description,
        imageUrl: map.imageUrl,
        isAIGenerated: map.isAIGenerated,
        createdAt: map.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get map error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/maps/:mapId
 * Harita bilgilerini güncelle
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = rateLimitResponse(userId, "PUT:/api/maps/[mapId]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const body = await req.json();
    const { name, description } = body;

    // Haritayı bul
    const existingMap = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        session: {
          include: {
            campaign: {
              select: {
                creatorId: true,
                players: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existingMap) {
      return NextResponse.json(
        { success: false, message: 'Harita bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü - sadece GM/oluşturucu güncelleyebilir
    const isCreator = existingMap.session.campaign.creatorId === userId;
    if (!isCreator) {
      return forbiddenResponse('Bu haritayı güncelleme yetkiniz yok');
    }

    // Güncelle
    const updatedMap = await prisma.map.update({
      where: { id: mapId },
      data: {
        name: name !== undefined ? name?.trim() || existingMap.name : existingMap.name,
        description: description !== undefined ? description?.trim() || null : existingMap.description,
      },
    });

    return NextResponse.json({
      success: true,
      map: {
        id: updatedMap.id,
        sessionId: updatedMap.sessionId,
        name: updatedMap.name,
        description: updatedMap.description,
        imageUrl: updatedMap.imageUrl,
        isAIGenerated: updatedMap.isAIGenerated,
        createdAt: updatedMap.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update map error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/maps/:mapId
 * Haritayı sil
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  try {
    const { mapId } = await params;

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = rateLimitResponse(userId, "DELETE:/api/maps/[mapId]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    // Haritayı bul
    const existingMap = await prisma.map.findUnique({
      where: { id: mapId },
      include: {
        session: {
          include: {
            campaign: {
              select: {
                creatorId: true,
                players: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existingMap) {
      return NextResponse.json(
        { success: false, message: 'Harita bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü - sadece GM/oluşturucu silebilir
    const isCreator = existingMap.session.campaign.creatorId === userId;
    if (!isCreator) {
      return forbiddenResponse('Bu haritayı silme yetkiniz yok');
    }

    // Sil
    await prisma.map.delete({
      where: { id: mapId },
    });

    return NextResponse.json({
      success: true,
      message: 'Harita başarıyla silindi',
    });
  } catch (error) {
    console.error('Delete map error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
