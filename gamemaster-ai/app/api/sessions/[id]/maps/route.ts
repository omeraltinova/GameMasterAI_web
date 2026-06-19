import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { normalizeImageUrl } from '@/lib/security/imageUrl';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/sessions/:id/maps
 * Session'a ait tüm haritaları listele
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "GET:/api/sessions/[id]/maps", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Session'ı bul ve yetki kontrolü yap
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
            players: {
              select: { userId: true },
            },
          },
        },
        maps: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = session.campaign.creatorId === userId;
    const isPlayer = session.campaign.players.some(p => p.userId === userId);

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    return NextResponse.json({
      success: true,
      maps: session.maps.map(map => ({
        id: map.id,
        sessionId: map.sessionId,
        name: map.name,
        description: map.description,
        imageUrl: map.imageUrl,
        isAIGenerated: map.isAIGenerated,
        createdAt: map.createdAt.toISOString(),
      })),
      total: session.maps.length,
    });
  } catch (error) {
    console.error('Get session maps error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/:id/maps
 * Session'a yeni harita ekle (manuel yükleme)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "POST:/api/sessions/[id]/maps", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const body = await req.json();
    const { name, description, imageUrl } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Harita adı gerekli' },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Görsel URL gerekli' },
        { status: 400 }
      );
    }

    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    if (!normalizedImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz görsel URL' },
        { status: 400 }
      );
    }

    // Session'ı bul ve yetki kontrolü yap
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
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
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = session.campaign.creatorId === userId;
    const isPlayer = session.campaign.players.some(p => p.userId === userId);

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Haritayı oluştur
    const map = await prisma.map.create({
      data: {
        sessionId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: normalizedImageUrl,
        isAIGenerated: false,
        prompt: null,
      },
    });

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
    }, { status: 201 });
  } catch (error) {
    console.error('Create map error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
