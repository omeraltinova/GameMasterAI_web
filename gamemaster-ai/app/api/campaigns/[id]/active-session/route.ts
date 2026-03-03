import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { generateOpeningNarration } from '@/lib/ai/gamemaster';
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from '@/lib/auth/permissions';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

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
    const limited = rateLimitResponse(userId, "GET:/api/campaigns/[id]/active-session", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    // 1. Oturumu al
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: true,
        scenario: true,
        players: {
          include: {
            character: true,
            user: true,
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
              take: 50,
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
    }

    // 2. Erişim kontrolü
    const actorRole = getCampaignActorRole(campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return NextResponse.json({ error: 'Bu oturuma erişimin yok' }, { status: 403 });
    }

    // 3. Session var mı?
    let session = campaign.sessions[0];
    
    // Session yoksa oluştur
    if (!session) {
      if (!canManageCampaign(actorRole)) {
        return NextResponse.json(
          { error: 'Session henüz başlatılmadı. Lütfen Game Master\'ın oyunu başlatmasını bekleyin.' },
          { status: 409 },
        );
      }

      console.log('[active-session] Yeni session oluşturuluyor...');
      
      // World settings parse
      type ParsedWorldSettings = {
        startingLocation?: {
          name?: string;
          description?: string;
          atmosphere?: string;
        };
        [key: string]: unknown;
      };

      let worldSettings: ParsedWorldSettings | null = null;
      const rawWorldSettings = campaign.scenario?.worldSettings;
      if (typeof rawWorldSettings === 'string' && rawWorldSettings.trim().length > 0) {
        try {
          const parsedWorldSettings = JSON.parse(rawWorldSettings) as unknown;
          if (parsedWorldSettings && typeof parsedWorldSettings === 'object') {
            worldSettings = parsedWorldSettings as ParsedWorldSettings;
          }
        } catch {
          worldSettings = null;
        }
      }

      // Session oluştur
      session = await prisma.gameSession.create({
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

      // İlk mesajı AI ile oluştur
      let welcomeMessage: string;
      const scenarioName = campaign.scenario?.title || campaign.name;
      const playerCharacter = campaign.players[0]?.character;

      // AI'dan açılış mesajı al
      if (campaign.scenario?.startingPrompt) {
        try {
          console.log('[active-session] AI açılış mesajı üretiliyor...');
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
          console.log('[active-session] AI mesajı oluşturuldu:', welcomeMessage.substring(0, 100));
        } catch (err) {
          console.error('[active-session] AI hatası:', err);
          welcomeMessage = `🎲 **${scenarioName}** oturumuna hoş geldiniz!\n\n${campaign.scenario.description || 'Macera başlamak üzere.'}`;
        }
      } else {
        welcomeMessage = `🎲 **${scenarioName}** oturumuna hoş geldiniz!\n\nMacera başlamak üzere.`;
      }

      // Mesajı kaydet
      await prisma.message.create({
        data: {
          sessionId: session.id,
          senderType: 'GM',
          senderName: 'Game Master',
          content: welcomeMessage,
        },
      });

      // Session'ı mesajlarla birlikte yeniden al
      const updatedSession = await prisma.gameSession.findUnique({
        where: { id: session.id },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 50,
          },
        },
      });
      
      if (updatedSession) {
        session = updatedSession;
      }
    }

    // Oturum durumunu ACTIVE yap
    if (campaign.status !== 'ACTIVE' && canManageCampaign(actorRole)) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
    }

    // Mesajlardaki metadata'yı parse et (gmPrompt ve suggestions çıkar)
    const processedSession = {
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

    return NextResponse.json({
      success: true,
      session: processedSession,
      campaign,
    });
  } catch (error) {
    console.error('Active session hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
