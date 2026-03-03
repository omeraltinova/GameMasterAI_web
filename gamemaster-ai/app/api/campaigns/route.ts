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

    const limited = rateLimitResponse(userId, "GET:/api/campaigns", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Kullanıcının oturumlarını al
    const campaigns = await prisma.campaign.findMany({
      where: {
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
            email: true,
          },
        },
        scenario: true,
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
        creator: camp.creator,
        scenario: camp.scenario,
        isMultiplayer: camp.isMultiplayer,
        maxPlayers: camp.maxPlayers,
        inviteCode: camp.inviteCode,
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

    const limited = rateLimitResponse(userId, "POST:/api/campaigns", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const inviteCode = randomBytes(4).toString('hex').toUpperCase();

    // Yeni oturum oluştur
    // Not: CampaignPlayer kaydı karakter seçildikten sonra oluşturulacak
    // Creator'ın oturumu görmesi için creatorId yeterli
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        creatorId: userId,
        scenarioId,
        isMultiplayer: isMultiplayer || false,
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
