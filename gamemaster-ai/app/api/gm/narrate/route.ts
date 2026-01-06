import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { callOpenRouterWithTools, OpenRouterMessage } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT, getNarrationPrompt } from '@/lib/ai/prompts';
import { buildSessionContext } from '@/lib/ai/context';
import { getUserId } from '@/lib/auth/server';
import type { GMPrompt, GMAction, LocationChange } from '@/types';

/**
 * POST /api/gm/narrate
 * Hikaye anlatımı için AI endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId, playerAction } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!playerAction || typeof playerAction !== 'string') {
      return NextResponse.json(
        { message: 'Geçersiz oyuncu aksiyonu' },
        { status: 400 }
      );
    }

    // Session'ı kontrol et
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            characters: true,
            players: {
              include: {
                user: true,
                character: true,
              },
            },
          },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının bu session'da yetkisi var mı? (creator veya player olabilir)
    const isCreator = gameSession.campaign.creatorId === userId;
    const isPlayer = gameSession.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return NextResponse.json(
        { message: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Context oluştur
    const context = await buildSessionContext(sessionId);

    // Oyuncunun karakter ID'sini bul
    const currentPlayer = gameSession.campaign.players.find(
      (p: any) => p.userId === userId
    );
    const characterId = currentPlayer?.character?.id;

    // AI mesajlarını hazırla
    const contextPrompt = contextToPrompt(context);
    const userPrompt = getNarrationPrompt(playerAction);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contextPrompt },
      { role: 'user', content: userPrompt },
    ];

    // AI Tool Calling ile yanıt al
    const aiResult = await callOpenRouterWithTools(messages, {
      temperature: 0.8,
      sessionId,
      characterId,
    });

    const aiResponse = aiResult.content;
    const toolResults = aiResult.toolResults;

    // AI yanıtını parse et
    let narration: string = aiResponse;
    let gmPrompt: GMPrompt | null = null;
    let locationChange: LocationChange | null = null;

    try {
      // JSON yanıtını parse etmeye çalış
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.narration) {
          narration = parsed.narration;
        }

        // LocationChange parse et
        if (parsed.locationChange && parsed.locationChange.changed) {
          locationChange = {
            changed: true,
            newLocation: parsed.locationChange.newLocation,
            locationType: parsed.locationChange.locationType || 'other',
            description: parsed.locationChange.description,
          };
        }

        if (parsed.gmPrompt && parsed.gmPrompt.actions && parsed.gmPrompt.actions.length > 0) {
          gmPrompt = {
            actions: parsed.gmPrompt.actions.map((action: any, index: number) => ({
              id: action.id || `action_${Date.now()}_${index}`,
              type: action.type || 'choice',
              label: action.label || 'Seç',
              description: action.description,
              diceType: action.diceType,
              diceCount: action.diceCount || 1,
              modifier: action.modifier || 0,
              skill: action.skill,
              ability: action.ability,
              dc: action.dc,
              value: action.value,
              isMandatory: action.isMandatory || false,
            })) as GMAction[],
            isMandatory: parsed.gmPrompt.isMandatory || false,
            promptText: parsed.gmPrompt.promptText,
          };
        }
      }
    } catch (parseError) {
      // JSON parse hatası, düz metin olarak kullan
      console.log('AI response is not JSON, using as plain text');
      narration = aiResponse;
    }

    // Tool results'tan ek bilgiler
    let newNPCs: any[] = [];
    let givenItems: any[] = [];
    let diceRollRequest: any = null;

    if (toolResults && toolResults.length > 0) {
      toolResults.forEach(result => {
        if (result.success) {
          if (result.toolName === 'create_npc' && result.result?.isNew) {
            newNPCs.push(result.result);
          } else if (result.toolName === 'give_item') {
            givenItems.push(result.result);
          } else if (result.toolName === 'request_dice_roll') {
            diceRollRequest = result.result;
          }
        }
      });
    }

    // Oyuncunun karakter adını bul
    const playerName = currentPlayer?.character?.name ||
      currentPlayer?.user?.username ||
      'Oyuncu';

    // Oyuncu mesajını kaydet
    await prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        senderType: 'PLAYER',
        senderName: playerName,
        content: playerAction,
      },
    });

    // GM yanıtını kaydet (metadata'da gmPrompt ve locationChange)
    const gmMessage = await prisma.message.create({
      data: {
        sessionId,
        senderType: 'GM',
        senderName: 'Game Master',
        content: narration,
        metadata: (gmPrompt || locationChange) ? JSON.stringify({ gmPrompt, locationChange }) : undefined,
      },
    });

    // Session state'i güncelle (lokasyon değişikliği varsa)
    if (locationChange && locationChange.changed && locationChange.newLocation) {
      const currentState = gameSession.currentState ?
        (typeof gameSession.currentState === 'string' ? JSON.parse(gameSession.currentState) : gameSession.currentState) :
        {};

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          currentState: JSON.stringify({
            ...currentState,
            location: locationChange.newLocation,
            locationType: locationChange.locationType,
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      // Sadece updatedAt güncelle
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      narration,
      gmPrompt,
      locationChange,
      messageId: gmMessage.id,
      timestamp: gmMessage.timestamp,
      // Tool results
      toolResults: {
        newNPCs,
        givenItems,
        diceRollRequest,
      },
    });
  } catch (error) {
    console.error('Narration error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * Yardımcı fonksiyon: Context'i prompt'a çevirir
 */
function contextToPrompt(context: any): string {
  let prompt = '';

  if (context.scenario) {
    prompt += `**Senaryo:** ${context.scenario}\n\n`;
  }

  if (context.location) {
    prompt += `**Mevcut Lokasyon:** ${context.location}\n\n`;
  }

  if (context.activeNPCs && context.activeNPCs.length > 0) {
    prompt += '**Aktif NPC\'ler:**\n';
    context.activeNPCs.forEach((npc: any) => {
      prompt += `- ${npc.name} (${npc.role})`;
      if (npc.personality) {
        prompt += ` - ${npc.personality}`;
      }
      if (npc.isHostile) {
        prompt += ' [Düşman]';
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (context.playerCharacters && context.playerCharacters.length > 0) {
    prompt += '**Parti Üyeleri:**\n';
    context.playerCharacters.forEach((char: any) => {
      prompt += `- ${char.name} (Level ${char.level} ${char.race} ${char.class})`;
      prompt += ` - HP: ${char.hp}/${char.maxHp}\n`;
    });
    prompt += '\n';
  }

  if (context.recentMessages && context.recentMessages.length > 0) {
    prompt += '**Son Olaylar:**\n';
    const lastMessages = context.recentMessages.slice(-10);
    lastMessages.forEach((msg: any) => {
      const sender = msg.senderType === 'PLAYER' ? 'Oyuncu' :
        msg.senderType === 'GM' ? 'GM' :
          msg.senderType === 'SYSTEM' ? 'Sistem' : msg.senderType;
      prompt += `[${sender}]: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  return prompt.trim();
}
