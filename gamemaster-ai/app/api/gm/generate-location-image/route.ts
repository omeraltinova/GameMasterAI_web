import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { generateLocationImage, getLocationStyleHints } from '@/lib/ai/imageGenerator';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';
import { normalizeImageUrl } from '@/lib/security/imageUrl';

const MAX_DESCRIPTION_LENGTH = 1200;
const MAX_MESSAGE_LENGTH = 240;
const MAX_NOTES_LENGTH = 200;
const MAX_BACKGROUND_LENGTH = 140;
const MAX_SCENARIO_LENGTH = 220;

function normalizeText(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength).trim()}...`;
}

function safeParseJson(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function buildCharacterSummary(character: any): string {
  const labelParts = [
    character?.name,
    character?.level ? `Level ${character.level}` : null,
    character?.race,
    character?.class,
  ].filter(Boolean);

  const label = labelParts.join(' ');
  if (!label) {
    return '';
  }

  const details: string[] = [];
  if (character?.background) {
    details.push(`background: ${normalizeText(String(character.background), MAX_BACKGROUND_LENGTH)}`);
  }
  if (character?.hp !== undefined && character?.maxHp !== undefined) {
    details.push(`HP ${character.hp}/${character.maxHp}`);
  }

  const stats = safeParseJson(character?.stats);
  if (stats && typeof stats === 'object') {
    const statLabels: Record<string, string> = {
      strength: 'STR',
      dexterity: 'DEX',
      constitution: 'CON',
      intelligence: 'INT',
      wisdom: 'WIS',
      charisma: 'CHA',
    };

    const statOrder = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const statParts = statOrder
      .map((key) => {
        const value = stats[key];
        return value !== undefined ? `${statLabels[key]} ${String(value)}` : null;
      })
      .filter(Boolean);

    if (statParts.length > 0) {
      details.push(`stats: ${statParts.join(', ')}`);
    }
  }

  if (details.length === 0) {
    return label;
  }

  return `${label} - ${details.join(', ')}`;
}

/**
 * POST /api/gm/generate-location-image
 * Mekan görseli üretme endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      sessionId, 
      locationName, 
      locationType, 
      description, 
      createMessage, 
      messageContent, 
      excludeFromContext 
    } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId gerekli' },
        { status: 400 }
      );
    }

    if (!locationName || !description) {
      return NextResponse.json(
        { success: false, error: 'locationName ve description gerekli' },
        { status: 400 }
      );
    }

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    // Session kontrolü
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
            players: {
              select: { userId: true },
            },
            scenario: {
              select: {
                title: true,
                description: true,
              },
            },
            characters: {
              select: {
                name: true,
                race: true,
                class: true,
                level: true,
                hp: true,
                maxHp: true,
                background: true,
                stats: true,
              },
            },
          },
        },
        messages: {
          take: 10,
          orderBy: { timestamp: 'desc' },
          select: {
            senderType: true,
            content: true,
            metadata: true,
            locationImageUrl: true,
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
    const currentState = session.currentState ? 
      (typeof session.currentState === 'string' ? JSON.parse(session.currentState) : session.currentState) : 
      {};

    const worldSettings = typeof currentState.worldSettings === 'object' && currentState.worldSettings
      ? currentState.worldSettings
      : null;

    const worldParts: string[] = [];
    if (worldSettings) {
      const worldName = worldSettings.worldName ? String(worldSettings.worldName) : '';
      const worldType = worldSettings.worldType ? String(worldSettings.worldType) : '';
      const setting = worldSettings.setting ? String(worldSettings.setting) : '';
      const era = worldSettings.era ? String(worldSettings.era) : '';
      const tone = worldSettings.tone ? String(worldSettings.tone) : '';
      const mainConflict = worldSettings.mainConflict ? String(worldSettings.mainConflict) : '';
      const uniqueElements = Array.isArray(worldSettings.uniqueElements)
        ? worldSettings.uniqueElements.slice(0, 3).map((item: any) => String(item))
        : [];

      const worldLine = [worldName, worldType, setting, era, tone, mainConflict]
        .filter(Boolean)
        .map((item) => normalizeText(item, MAX_SCENARIO_LENGTH));

      if (worldLine.length > 0) {
        worldParts.push(worldLine.join(', '));
      }
      if (uniqueElements.length > 0) {
        worldParts.push(`unique elements: ${uniqueElements.join(', ')}`);
      }
    }

    const scenarioParts: string[] = [];
    if (session.campaign.scenario?.title) {
      scenarioParts.push(`scenario: ${normalizeText(session.campaign.scenario.title, MAX_SCENARIO_LENGTH)}`);
    }
    if (session.campaign.scenario?.description) {
      scenarioParts.push(`scenario summary: ${normalizeText(session.campaign.scenario.description, MAX_SCENARIO_LENGTH)}`);
    }

    const characterSummaries = session.campaign.characters
      .map((character: any) => buildCharacterSummary(character))
      .filter(Boolean);

    const recentEvents = session.messages
      .filter((msg: any) => {
        const metadata = safeParseJson(msg.metadata);
        if (metadata?.excludeFromContext === true) {
          return false;
        }
        if (msg.senderType === 'SYSTEM' && msg.locationImageUrl) {
          return false;
        }
        return msg.senderType !== 'DICE';
      })
      .reverse()
      .slice(-5)
      .map((msg: any) => {
        const sender = msg.senderType === 'GM'
          ? 'GM'
          : msg.senderType === 'PLAYER'
            ? 'Player'
            : msg.senderType;
        return `${sender}: ${normalizeText(String(msg.content), MAX_MESSAGE_LENGTH)}`;
      });

    const contextParts: string[] = [];
    contextParts.push(`scene focus: ${locationName}`);
    if (locationType) {
      contextParts.push(`location type: ${locationType}`);
    }
    if (currentState.location && currentState.location !== locationName) {
      contextParts.push(`current location: ${normalizeText(String(currentState.location), MAX_SCENARIO_LENGTH)}`);
    }
    if (currentState.timeOfDay) {
      contextParts.push(`time of day: ${normalizeText(String(currentState.timeOfDay), 80)}`);
    }
    if (currentState.weather) {
      contextParts.push(`weather: ${normalizeText(String(currentState.weather), 80)}`);
    }
    if (currentState.atmosphere) {
      contextParts.push(`atmosphere: ${normalizeText(String(currentState.atmosphere), 120)}`);
    }
    if (Array.isArray(currentState.activeNPCs) && currentState.activeNPCs.length > 0) {
      contextParts.push(`active NPCs: ${currentState.activeNPCs.slice(0, 5).join(', ')}`);
    }
    if (Array.isArray(currentState.activeQuests) && currentState.activeQuests.length > 0) {
      contextParts.push(`active quests: ${currentState.activeQuests.slice(0, 3).join(', ')}`);
    }
    if (currentState.notes) {
      contextParts.push(`notes: ${normalizeText(String(currentState.notes), MAX_NOTES_LENGTH)}`);
    }
    if (worldParts.length > 0) {
      contextParts.push(`world: ${worldParts.join(' | ')}`);
    }
    if (scenarioParts.length > 0) {
      contextParts.push(scenarioParts.join(' | '));
    }
    if (characterSummaries.length > 0) {
      contextParts.push(`party: ${characterSummaries.join(' | ')}`);
    }
    if (recentEvents.length > 0) {
      contextParts.push(`recent events: ${recentEvents.join(' / ')}`);
    }

    const normalizedDescription = normalizeText(String(description), MAX_DESCRIPTION_LENGTH);

    // Add style hints
    const styleHints = getLocationStyleHints(locationType || 'other');
    const fullPrompt = [
      normalizedDescription,
      contextParts.join('. '),
      styleHints,
    ].filter(Boolean).join('. ');

    console.log(`[LocationImage API] Generating image for: ${locationName}`);
    console.log(`[LocationImage API] Type: ${locationType}, Prompt length: ${fullPrompt.length}`);

    // Görsel üret
    const result = await generateLocationImage(fullPrompt, locationType || 'other');

    console.log(`[LocationImage API] Result:`, { success: result.success, hasUrl: !!result.imageUrl, error: result.error });

    if (!result.success) {
      console.error(`[LocationImage API] Failed:`, result.error);
      return NextResponse.json(
        { 
          success: false,
          message: result.error || 'Görsel üretilemedi' 
        },
        { status: 500 }
      );
    }

    const normalizedImageUrl = normalizeImageUrl(result.imageUrl);
    if (!normalizedImageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'Üretilen görsel URL’i güvenlik kurallarını karşılamıyor',
        },
        { status: 502 }
      );
    }

    // Session'ın currentState'ini güncelle (lokasyon bilgisi ve görsel URL'i)
    // Update session currentState with location and image info
    const updatedState = {
      ...currentState,
      location: locationName,
      locationType: locationType || 'other',
      locationImage: normalizedImageUrl,
      locationImagePrompt: fullPrompt,
    };

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentState: JSON.stringify(updatedState),
        updatedAt: new Date(),
      },
    });

    let imageMessage = null;
    if (createMessage) {
      const safeContent = typeof messageContent === 'string' && messageContent.trim().length > 0
        ? messageContent.trim()
        : `Scene image: ${locationName}`;
      const metadata = {
        isImageMessage: true,
        excludeFromContext: excludeFromContext !== false,
      };

      imageMessage = await prisma.message.create({
        data: {
          sessionId,
          senderType: 'GM',
          senderName: 'Game Master',
          content: safeContent,
          locationImageUrl: normalizedImageUrl,
          locationName,
          metadata: JSON.stringify(metadata),
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: normalizedImageUrl,
      revisedPrompt: result.revisedPrompt,
      location: {
        name: locationName,
        type: locationType,
        description: description,
      },
      message: imageMessage ? {
        id: imageMessage.id,
        sessionId: imageMessage.sessionId,
        senderId: imageMessage.senderId,
        senderType: imageMessage.senderType,
        senderName: imageMessage.senderName,
        content: imageMessage.content,
        metadata: imageMessage.metadata ? JSON.parse(imageMessage.metadata) : undefined,
        locationImageUrl: imageMessage.locationImageUrl,
        locationName: imageMessage.locationName,
        timestamp: imageMessage.timestamp,
      } : undefined,
    });

  } catch (error) {
    console.error('Generate location image error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
