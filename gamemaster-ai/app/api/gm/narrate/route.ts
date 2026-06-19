import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { callOpenRouterWithTools, OpenRouterMessage } from '@/lib/ai/openrouter';
import { SYSTEM_PROMPT, getNarrationPrompt } from '@/lib/ai/prompts';
import { buildSessionContext } from '@/lib/ai/context';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';
import type { GMPrompt, GMAction, LocationChange } from '@/types';

const ALLOWED_GM_ACTION_TYPES = new Set([
  'dice_roll',
  'choice',
  'confirm',
  'free_text',
  'skill_check',
  'saving_throw',
  'attack_roll',
]);
const ALLOWED_DICE_TYPES = new Set(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);
const MAX_GM_PROMPT_ACTIONS = 6;

function cleanPromptString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, numeric));
}

function sanitizeGmPrompt(value: unknown): GMPrompt | null {
  if (!value || typeof value !== 'object') return null;

  const rawPrompt = value as { actions?: unknown; isMandatory?: unknown; promptText?: unknown };
  if (!Array.isArray(rawPrompt.actions) || rawPrompt.actions.length === 0) {
    return null;
  }

  const actions = rawPrompt.actions
    .slice(0, MAX_GM_PROMPT_ACTIONS)
    .map((rawAction, index) => {
      const action = rawAction && typeof rawAction === 'object'
        ? rawAction as Record<string, unknown>
        : {};

      const rawType = typeof action.type === 'string' ? action.type : '';
      const type = ALLOWED_GM_ACTION_TYPES.has(rawType) ? rawType : 'choice';
      const rawDiceType = typeof action.diceType === 'string' ? action.diceType : undefined;
      const diceType = rawDiceType && ALLOWED_DICE_TYPES.has(rawDiceType) ? rawDiceType : undefined;

      return {
        id: cleanPromptString(action.id, 80) || `action_${Date.now()}_${index}`,
        type,
        label: cleanPromptString(action.label, 80) || 'Seç',
        description: cleanPromptString(action.description, 240),
        diceType,
        diceCount: clampInt(action.diceCount, 1, 20, 1),
        modifier: clampInt(action.modifier, -100, 100, 0),
        skill: cleanPromptString(action.skill, 60),
        ability: cleanPromptString(action.ability, 60),
        dc: action.dc === undefined ? undefined : clampInt(action.dc, 1, 40, 10),
        value: cleanPromptString(action.value, 500),
        isMandatory: action.isMandatory === true,
      } as GMAction;
    });

  return {
    actions,
    isMandatory: rawPrompt.isMandatory === true,
    promptText: cleanPromptString(rawPrompt.promptText, 240),
  };
}

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
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { sessionId, playerAction, skipPlayerMessageSave } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!playerAction || typeof playerAction !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Geçersiz oyuncu aksiyonu' },
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
        { success: false, error: 'Session bulunamadı' },
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
        { success: false, error: 'Bu session\'a erişim yetkiniz yok' },
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
      userId,
    });

    const aiResponse = aiResult.content;
    const toolResults = aiResult.toolResults;

    // AI yanıtını parse et
    let narration: string = '';
    let gmPrompt: GMPrompt | null = null;
    let locationChange: LocationChange | null = null;

    try {
      // AI yanıtından JSON çıkar
      let jsonContent = aiResponse;

      // Markdown code block içindeki JSON'ı çıkar (```json ... ```)
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }

      // JSON objesini bul - en dıştaki { ile } arasını al  
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Narration çıkar ve temizle
        if (parsed.narration && typeof parsed.narration === 'string') {
          narration = parsed.narration.trim();
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

        gmPrompt = sanitizeGmPrompt(parsed.gmPrompt);
      }
    } catch (parseError) {
      // JSON parse hatası
      console.log('AI response JSON parse error, using as plain text');

      // Parse başarısız olsa bile regex ile narration alanını kurtarmaya çalış
      const narrationMatch = aiResponse.match(/"narration"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (narrationMatch) {
        try {
          // JSON string escape karakterlerini çöz
          narration = JSON.parse(`"${narrationMatch[1]}"`);
        } catch {
          narration = narrationMatch[1];
        }
      }
    }

    // Eğer narration hala boş ise, ham yanıtı işle
    if (!narration || narration.trim() === '') {
      // 1. JSON parse edemedik ama belki metin JSON formatında değildir?
      // Eğer JSON benzeri yapı yoksa (süslü parantez), doğrudan metni kullan
      if (!aiResponse.includes('{')) {
        narration = aiResponse.trim();
      } else {
        // 2. JSON var ama parse edemedik. Code block içindeyse, code block dışındakileri al
        // Genelde AI: "İşte hikaye: {json}" veya "{json} Umarım beğenirsin" der.

        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
        const textWithoutCodeBlocks = aiResponse.replace(codeBlockRegex, '').trim();

        if (textWithoutCodeBlocks.length > 20) {
          // Yeterince uzun metin varsa bunu kullan (JSON dışı açıklama)
          narration = textWithoutCodeBlocks;
        } else {
          // Son çare: Regex ile temizlemeye çalış ama çok agresif olma
          narration = aiResponse
            .replace(/```json[\s\S]*?```/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\{[\s\S]*\}/g, '')
            .trim();
        }
      }

      // Hala boşsa fallback
      if (!narration || narration.length < 5) {
        narration = 'Hikaye devam ediyor... (AI yanıtı işlenemedi)';
      }
    }

    // Tool results'tan ek bilgiler
    const newNPCs: any[] = [];
    const givenItems: any[] = [];
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

    // Oyuncu mesajını kaydet (eğer regenerate değilse)
    let playerMessageId: string | null = null;
    let playerMessageTimestamp: Date | null = null;

    if (!skipPlayerMessageSave) {
      const playerMessage = await prisma.message.create({
        data: {
          sessionId,
          senderId: userId,
          senderType: 'PLAYER',
          senderName: playerName,
          content: playerAction,
        },
      });
      playerMessageId = playerMessage.id;
      playerMessageTimestamp = playerMessage.timestamp;
    }

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
      // Oyuncu mesajı bilgileri
      playerMessageId,
      playerMessageTimestamp,
      playerName,
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
      { success: false, error: 'Sunucu hatası oluştu' },
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
