import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse } from '@/lib/auth/server';
import { randomBytes } from 'crypto';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/campaigns
 * Kullanıcının oturumları endpoint'i
 */
export async function GET(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId(req);
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "GET:/api/campaigns", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Kullanıcının oturumlarını al
    const campaigns = await prisma.campaign.findMany({
      where: {
        isSoftDeleted: false,
        OR: [
          { creatorId: userId },
          {
            players: {
              some: {
                userId: userId,
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        scenario: {
          select: {
            id: true,
            title: true,
            description: true,
            genre: true,
            difficulty: true,
            startingPrompt: true,
            isOfficial: true,
            isFeatured: true,
            tags: true,
            worldSettings: true,
            isSoftDeleted: true,
            createdAt: true,
          },
        },
        characters: {
          where: {
            campaignId: {
              not: null,
            },
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
            character: true,
          },
        },
        sessions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      campaigns: campaigns.map((camp: any) => ({
        id: camp.id,
        name: camp.name,
        description: camp.description,
        creatorId: camp.creatorId,
        creator: camp.creator
          ? {
              id: camp.creator.id,
              username: camp.creator.username,
            }
          : null,
        scenario: camp.scenario?.isSoftDeleted ? null : camp.scenario,
        isMultiplayer: camp.isMultiplayer,
        maxPlayers: camp.maxPlayers,
        inviteCode:
          camp.isMultiplayer && camp.creatorId === userId
            ? camp.inviteCode
            : null,
        status: camp.status,
        characterCount: camp.characters.length,
        playerCount: camp.players.length,
        players: camp.players,
        lastSession: camp.sessions[0] || null,
        createdAt: camp.createdAt,
        updatedAt: camp.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Campaigns get error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Yeni oturum endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, scenarioId, isMultiplayer, maxPlayers } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Oturum adı gerekiyor' },
        { status: 400 }
      );
    }

    // Auth kontrolü
    const userId = await getUserId(req);
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "POST:/api/campaigns", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const multiplayer = Boolean(isMultiplayer);
    // 9 bytes = 72 bits of entropy (18 hex chars). High enough to make
    // brute-force enumeration of invite codes infeasible even under weak
    // rate limiting. Lookup normalizes via toUpperCase(), so hex stays valid.
    const inviteCode = multiplayer ? randomBytes(9).toString('hex').toUpperCase() : null;

    // Yeni oturum oluştur
    // Not: CampaignPlayer kaydı karakter seçildikten sonra oluşturulacak
    // Creator'ın oturumu görmesi için creatorId yeterli
    if (scenarioId) {
      const scenario = await prisma.scenario.findFirst({
        where: { id: scenarioId, isSoftDeleted: false },
        select: { id: true },
      });

      if (!scenario) {
        return NextResponse.json(
          { success: false, error: 'Senaryo bulunamadı veya pasif durumda' },
          { status: 404 }
        );
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        creatorId: userId,
        scenarioId,
        isMultiplayer: multiplayer,
        maxPlayers: maxPlayers || 4,
        inviteCode,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        creatorId: campaign.creatorId,
        scenarioId: campaign.scenarioId,
        isMultiplayer: campaign.isMultiplayer,
        maxPlayers: campaign.maxPlayers,
        inviteCode: campaign.inviteCode,
        status: campaign.status,
        createdAt: campaign.createdAt,
      },
      message: 'Oturum başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
