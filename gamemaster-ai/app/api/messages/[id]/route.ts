import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse } from '@/lib/auth/server';
import { normalizeImageUrl } from '@/lib/security/imageUrl';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

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

    const limited = rateLimitResponse(userId, "PATCH:/api/messages/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id: messageId } = await params;
    const body = await req.json();
    const { locationImageUrl, locationName } = body;

    let normalizedLocationImageUrl: string | null | undefined = undefined;
    if (locationImageUrl !== undefined) {
      if (locationImageUrl === null || locationImageUrl === "") {
        normalizedLocationImageUrl = null;
      } else if (typeof locationImageUrl === "string") {
        const safeImageUrl = normalizeImageUrl(locationImageUrl);
        if (!safeImageUrl) {
          return NextResponse.json(
            { success: false, error: "Geçersiz görsel URL" },
            { status: 400 }
          );
        }
        normalizedLocationImageUrl = safeImageUrl;
      } else {
        return NextResponse.json(
          { success: false, error: "Geçersiz görsel URL" },
          { status: 400 }
        );
      }
    }

    if (locationName !== undefined && locationName !== null && typeof locationName !== "string") {
      return NextResponse.json(
        { success: false, error: "Geçersiz konum adı" },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Mesaj bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = message.session.campaign.creatorId === userId;
    const isSender = message.senderId === userId;

    if (!isCreator && !isSender) {
      return NextResponse.json(
        { success: false, error: 'Bu mesajı güncelleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Mesajı güncelle
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        locationImageUrl: normalizedLocationImageUrl,
        locationName: locationName === null
          ? null
          : (typeof locationName === "string" ? locationName : undefined),
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });

  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
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
