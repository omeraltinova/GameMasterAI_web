import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { generateOpeningNarration } from '@/lib/ai/gamemaster';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    // 1. Kampanyayı al
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
      return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 });
    }

    // 2. Erişim kontrolü
    const hasAccess = campaign.creatorId === userId ||
                     campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Bu kampanyaya erişimin yok' }, { status: 403 });
    }

    // 3. Session var mı?
    let session = campaign.sessions[0];
    
    // Session yoksa oluştur
    if (!session) {
      console.log('[active-session] Yeni session oluşturuluyor...');
      
      // World settings parse
      let worldSettings = null;
      // @ts-ignore
      if (campaign.scenario?.worldSettings) {
        try {
          // @ts-ignore
          worldSettings = typeof campaign.scenario.worldSettings === 'string' 
            // @ts-ignore
            ? JSON.parse(campaign.scenario.worldSettings) 
            // @ts-ignore
            : campaign.scenario.worldSettings;
        } catch (e) {}
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
          });
          console.log('[active-session] AI mesajı oluşturuldu:', welcomeMessage.substring(0, 100));
        } catch (err) {
          console.error('[active-session] AI hatası:', err);
          welcomeMessage = `🎲 **${scenarioName}** kampanyasına hoş geldiniz!\n\n${campaign.scenario.description || 'Macera başlamak üzere.'}`;
        }
      } else {
        welcomeMessage = `🎲 **${scenarioName}** kampanyasına hoş geldiniz!\n\nMacera başlamak üzere.`;
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

    // Kampanya durumunu ACTIVE yap
    if (campaign.status !== 'ACTIVE') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
    }

    return NextResponse.json({
      success: true,
      session,
      campaign,
    });
  } catch (error) {
    console.error('Active session hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
