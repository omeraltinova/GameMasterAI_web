import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/users?search=keyword&page=1&limit=20
 * Kullanıcı arama ve listeleme
 */
export async function GET(req: NextRequest) {
  try {
    const currentUserId = await getUserId();
    if (!currentUserId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(currentUserId, "GET:/api/users", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Arama filtresi
    const whereClause = search
      ? {
          username: {
            contains: search,
          },
        }
      : {};

    // Toplam sayı
    const totalCount = await prisma.user.count({ where: whereClause });

    // Kullanıcıları getir
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            characters: true,
            campaigns: true,
            campaignPlayers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        characterCount: user._count.characters,
        campaignCount: user._count.campaigns + user._count.campaignPlayers,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
