import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    // 1. Get campaign with all relations
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
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Kampanya bulunamadı' },
        { status: 404 }
      );
    }

    // 2. Check access permissions
    const hasAccess = campaign.creatorId === userId ||
                     campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bu kampanyaya erişimin yok' },
        { status: 403 }
      );
    }

    // 3. Find or create active session
    let session;
    
    if (campaign.status === 'ACTIVE' && campaign.sessions.length > 0) {
      // CASE 1: Active session exists - return it
      session = campaign.sessions[0];
    } else if (campaign.status === 'PAUSED' && campaign.sessions.length > 0) {
      // CASE 3: Paused campaign - resume session
      session = campaign.sessions[0];
      
      // Update campaign status to ACTIVE
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
    } else {
      // CASE 2: No active session - create new one
      let worldSettings = null;
      // @ts-ignore - Prisma client out of sync
      if (campaign.scenario?.worldSettings) {
        try {
          // @ts-ignore
          worldSettings = typeof campaign.scenario.worldSettings === 'string' 
            // @ts-ignore
            ? JSON.parse(campaign.scenario.worldSettings) 
            // @ts-ignore
            : campaign.scenario.worldSettings;
        } catch (e) {
          console.error('Scenario world settings parsing err', e);
        }
      }

      const initialState = {
        worldSettings: worldSettings || {},
        location: worldSettings?.startingLocation?.name || 
                 (campaign.scenario?.startingPrompt ? campaign.scenario.startingPrompt.substring(0, 50) : 'Başlangıç'),
        timeOfDay: 'morning',
        weather: worldSettings?.startingLocation?.atmosphere?.split(',')[0] || 'clear', // Try to guess weather from atmosphere or default
        activeNPCs: [],
        activeQuests: [],
        notes: worldSettings?.setting || 'Yeni macera başlıyor',
      };

      session = await prisma.gameSession.create({
        data: {
          campaignId,
          currentState: JSON.stringify(initialState),
          aiContext: campaign.scenario?.startingPrompt || '',
        },
        include: {
          campaign: {
            include: {
              players: {
                include: {
                  character: true,
                },
              },
            },
          },
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 50, // Last 50 messages
          },
          npcs: true,
        },
      });

      // Hoşgeldin mesajı oluştur
      const scenarioName = campaign.scenario?.title || campaign.name;
      const welcomeMessage = campaign.scenario?.startingPrompt 
        ? campaign.scenario.startingPrompt
        : `🎲 **${scenarioName}** kampanyasına hoş geldiniz!\n\nMacera başlamak üzere. Karakterinizi hazırlayın ve ilk adımınızı atın. Dünya sizi bekliyor...\n\n*Aksiyonunuzu yazarak hikayeye başlayabilirsiniz.*`;

      await prisma.message.create({
        data: {
          sessionId: session.id,
          senderType: 'GM',
          senderName: 'Game Master',
          content: welcomeMessage,
        },
      });

      // Update campaign status to ACTIVE
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
    console.error('Active session alınamadı:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
