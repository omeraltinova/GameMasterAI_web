import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { generateOpeningNarration } from '@/lib/ai/gamemaster';
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

type ParsedWorldSettings = {
  startingLocation?: {
    name?: string;
    description?: string;
    atmosphere?: string;
  };
  [key: string]: unknown;
};

async function getCampaignWithLatestSession(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      description: true,
      creatorId: true,
      scenarioId: true,
      isMultiplayer: true,
      maxPlayers: true,
      inviteCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
        },
      },
      scenario: {
        select: {
          id: true,
          title: true,
          description: true,
          startingPrompt: true,
          worldSettings: true,
          isOfficial: true,
        },
      },
      players: {
        select: {
          id: true,
          campaignId: true,
          userId: true,
          characterId: true,
          joinedAt: true,
          isActive: true,
          character: true,
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          messages: {
            where: {
              isSoftDeleted: false,
            },
            orderBy: { timestamp: 'asc' },
            take: 50,
          },
        },
      },
    },
  });
}

function parseWorldSettings(rawWorldSettings: string | null | undefined) {
  if (typeof rawWorldSettings !== 'string' || rawWorldSettings.trim().length === 0) {
    return null;
  }

  try {
    const parsedWorldSettings = JSON.parse(rawWorldSettings) as unknown;
    if (parsedWorldSettings && typeof parsedWorldSettings === 'object') {
      return parsedWorldSettings as ParsedWorldSettings;
    }
  } catch {
    // ignore invalid world settings
  }

  return null;
}

function processSession(session: any) {
  return {
    ...session,
    messages: (session.messages || []).map((msg: any) => {
      let gmPrompt = undefined;
      let suggestions = undefined;
      let metadata: Record<string, unknown> | undefined = undefined;

      if (msg.metadata) {
        try {
          metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
          if (metadata && metadata.gmPrompt) {
            gmPrompt = metadata.gmPrompt;
          }
          if (metadata && metadata.suggestions) {
            suggestions = metadata.suggestions;
          }
        } catch {
          // metadata parse edilemezse ignore et
        }
      }

      return {
        ...msg,
        metadata,
        gmPrompt,
        suggestions,
      };
    }),
  };
}

async function createSessionForCampaign(campaign: any, campaignId: string, userId: string) {
  const worldSettings = parseWorldSettings(campaign.scenario?.worldSettings);

  let session = await prisma.gameSession.create({
    data: {
      campaignId,
      currentState: JSON.stringify({
        worldSettings: worldSettings || {},
        location: worldSettings?.startingLocation?.name || 'Başlangıç',
        timeOfDay: 'morning',
        weather: 'clear',
        activeNPCs: [],
        activeQuests: [],
      }),
      aiContext: campaign.scenario?.startingPrompt || '',
    },
    include: {
      messages: true,
    },
  });

  let welcomeMessage: string;
  const scenarioName = campaign.scenario?.title || campaign.name;
  const playerCharacter = campaign.players[0]?.character;

  if (campaign.scenario?.startingPrompt) {
    try {
      welcomeMessage = await generateOpeningNarration({
        scenarioTitle: campaign.scenario.title,
        scenarioDescription: campaign.scenario.description,
        gmInstructions: campaign.scenario.startingPrompt,
        worldSettings,
        characterName: playerCharacter?.name,
        characterClass: playerCharacter?.class,
        characterRace: playerCharacter?.race,
        userId,
      });
    } catch {
      welcomeMessage = `🎲 **${scenarioName}** oturumuna hoş geldiniz!\n\n${campaign.scenario.description || 'Macera başlamak üzere.'}`;
    }
  } else {
    welcomeMessage = `🎲 **${scenarioName}** oturumuna hoş geldiniz!\n\nMacera başlamak üzere.`;
  }

  await prisma.message.create({
    data: {
      sessionId: session.id,
      senderType: 'GM',
      senderName: 'Game Master',
      content: welcomeMessage,
    },
  });

  const refreshedSession = await prisma.gameSession.findUnique({
    where: { id: session.id },
    include: {
      messages: {
        where: {
          isSoftDeleted: false,
        },
        orderBy: { timestamp: 'asc' },
        take: 50,
      },
    },
  });

  if (refreshedSession) {
    session = refreshedSession;
  }

  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const limited = rateLimitResponse(userId, 'GET:/api/campaigns/[id]/active-session', RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const campaign = await getCampaignWithLatestSession(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
    }

    const actorRole = getCampaignActorRole(campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return NextResponse.json({ error: 'Bu oturuma erişimin yok' }, { status: 403 });
    }

    const session = campaign.sessions[0];
    if (!session) {
      return NextResponse.json(
        { error: 'Session henüz başlatılmadı. Başlatmak için POST /active-session kullanın.' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      session: processSession(session),
      campaign,
    });
  } catch (error) {
    console.error('Active session GET hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const limited = rateLimitResponse(userId, 'POST:/api/campaigns/[id]/active-session', RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const campaign = await getCampaignWithLatestSession(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
    }

    const actorRole = getCampaignActorRole(campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return NextResponse.json({ error: 'Bu oturuma erişimin yok' }, { status: 403 });
    }

    let session = campaign.sessions[0];
    if (!session) {
      if (!canManageCampaign(actorRole)) {
        return NextResponse.json(
          { error: 'Session henüz başlatılmadı. Lütfen Game Master\'ın oyunu başlatmasını bekleyin.' },
          { status: 409 },
        );
      }

      session = await createSessionForCampaign(campaign, campaignId, userId);
    }

    let campaignForResponse = campaign;
    if (campaign.status !== 'ACTIVE' && canManageCampaign(actorRole)) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });

      campaignForResponse = {
        ...campaign,
        status: 'ACTIVE',
      };
    }

    return NextResponse.json({
      success: true,
      session: processSession(session),
      campaign: campaignForResponse,
    });
  } catch (error) {
    console.error('Active session POST hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
