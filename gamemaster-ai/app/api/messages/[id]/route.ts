import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse } from '@/lib/auth/server';

/**
 * Update message handler
 */
async function updateMessage(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { id: messageId } = await params;
    const body = await req.json();
    const { locationImageUrl, locationName } = body;

    // Mesajı kontrol et
    const message = await prisma.message.findUnique({
      where: { id: messageId },
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

    if (!message) {
      return NextResponse.json(
        { message: 'Mesaj bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = message.session.campaign.creatorId === userId;
    const isSender = message.senderId === userId;

    if (!isCreator && !isSender) {
      return NextResponse.json(
        { message: 'Bu mesajı güncelleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Mesajı güncelle
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        locationImageUrl: locationImageUrl || undefined,
        locationName: locationName || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });

  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/[id]
 * Update message (e.g., add location image)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateMessage(req, { params });
}

/**
 * PUT /api/messages/[id]
 * Update message (e.g., add location image)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateMessage(req, { params });
}
