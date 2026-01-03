// Context Management System
// GameMaster AI için context oluşturma ve yönetimi

import { GameContext, buildContextPrompt } from './prompts';
import { prisma } from '@/lib/db/prisma';

// ============================================
// CONTEXT BUILDER FUNCTIONS
// ============================================

/**
 * Session ID'sine göre tam oyun context'i oluşturur
 */
export async function buildSessionContext(sessionId: string): Promise<GameContext> {
  // Session'ı al
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      campaign: {
        include: {
          scenario: true,
          characters: {
            include: {
              user: true,
            },
          },
          players: {
            include: {
              user: true,
              character: true,
            },
          },
        },
      },
      messages: {
        take: 20,
        orderBy: { timestamp: 'desc' },
      },
      npcs: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Game state'i parse et
  const gameState = JSON.parse(session.currentState || '{}');

  // Context'i oluştur
  const context: GameContext = {
    scenario: session.campaign.scenario?.title || 'Özel Kampanya',
    location: gameState.location || 'Bilinmeyen',
    timeOfDay: gameState.timeOfDay,
    weather: gameState.weather,
    activeNPCs: session.npcs.map((npc: any) => ({
      name: npc.name,
      role: npc.role,
      personality: npc.personality || undefined,
      isHostile: npc.isHostile,
    })),
    playerCharacters: session.campaign.characters.map((char: any) => ({
      name: char.name,
      race: char.race,
      class: char.class,
      level: char.level,
      hp: char.hp,
      maxHp: char.maxHp,
    })),
    recentMessages: session.messages.reverse().map((msg: any) => ({
      senderType: msg.senderType,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })),
    gameState: {
      inCombat: gameState.inCombat,
      currentQuest: gameState.activeQuests?.[0],
      notes: gameState.notes,
    },
  };

  return context;
}

/**
 * Basit context oluşturur (session olmadan)
 */
export function buildSimpleContext(params: {
  scenario: string;
  location: string;
  playerCharacters?: Array<{
    name: string;
    race: string;
    class: string;
    level: number;
    hp: number;
    maxHp: number;
  }>;
  recentMessages?: Array<{
    senderType: string;
    content: string;
  }>;
}): GameContext {
  return {
    scenario: params.scenario,
    location: params.location,
    playerCharacters: params.playerCharacters || [],
    recentMessages: params.recentMessages || [],
  };
}

/**
 * NPC context'i oluşturur
 */
export interface NPCContext {
  name: string;
  role: string;
  personality?: string;
  isHostile?: boolean;
  dialogueHistory?: Array<{
    speaker: string;
    content: string;
    timestamp: string;
  }>;
}

export async function buildNPCContext(npcId: string): Promise<NPCContext> {
  const npc = await prisma.nPC.findUnique({
    where: { id: npcId },
    include: {
      session: {
        include: {
          messages: {
            where: {
              content: {
                contains: npcId,
              },
            },
            take: 10,
            orderBy: { timestamp: 'desc' },
          },
        },
      },
    },
  });

  if (!npc) {
    throw new Error('NPC not found');
  }

  const dialogueHistory = npc.session.messages
    .filter((msg: any) => msg.content.includes(npc.name))
    .map((msg: any) => ({
      speaker: msg.senderType,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    }));

  return {
    name: npc.name,
    role: npc.role,
    personality: npc.personality || undefined,
    isHostile: npc.isHostile,
    dialogueHistory,
  };
}

// ============================================
// CONTEXT MANAGEMENT
// ============================================

/**
 * Context'i optimize eder (token limit'i aşmamak için)
 */
export function optimizeContext(
  context: GameContext,
  maxTokens: number = 4000
): GameContext {
  // Basit token tahmini (1 token ≈ 4 karakter)
  const estimatedTokens = JSON.stringify(context).length / 4;

  if (estimatedTokens <= maxTokens) {
    return context;
  }

  // Token limit'i aşılıyorsa, son mesajları kısalt
  const optimized: GameContext = {
    ...context,
    recentMessages: context.recentMessages?.slice(-5) || [], // Son 5 mesaj
  };

  return optimized;
}

/**
 * Context'i günceller (yeni mesaj ekleme)
 */
export function updateContextWithMessage(
  context: GameContext,
  senderType: string,
  content: string
): GameContext {
  return {
    ...context,
    recentMessages: [
      ...(context.recentMessages || []),
      {
        senderType,
        content,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Context'te lokasyon değişikliği
 */
export function updateContextLocation(
  context: GameContext,
  newLocation: string,
  timeOfDay?: string,
  weather?: string
): GameContext {
  return {
    ...context,
    location: newLocation,
    timeOfDay: timeOfDay || context.timeOfDay,
    weather: weather || context.weather,
  };
}

/**
 * Context'e NPC ekleme
 */
export function addNPCToContext(
  context: GameContext,
  npc: {
    name: string;
    role: string;
    personality?: string;
    isHostile?: boolean;
  }
): GameContext {
  return {
    ...context,
    activeNPCs: [...(context.activeNPCs || []), npc],
  };
}

/**
 * Context'te savaş durumu güncelleme
 */
export function updateCombatStatus(
  context: GameContext,
  inCombat: boolean
): GameContext {
  return {
    ...context,
    gameState: {
      ...context.gameState,
      inCombat,
    },
  };
}

// ============================================
// CONTEXT VALIDATION
// ============================================

/**
 * Context'in geçerli olup olmadığını kontrol eder
 */
export function validateContext(context: GameContext): boolean {
  if (!context.scenario || !context.location) {
    return false;
  }

  return true;
}

/**
 * Context'te eksik bilgileri doldurur
 */
export function fillMissingContext(context: GameContext): GameContext {
  return {
    scenario: context.scenario || 'Özel Kampanya',
    location: context.location || 'Bilinmeyen Lokasyon',
    timeOfDay: context.timeOfDay || 'gündüz',
    weather: context.weather || 'açık',
    activeNPCs: context.activeNPCs || [],
    playerCharacters: context.playerCharacters || [],
    recentMessages: context.recentMessages || [],
    gameState: {
      inCombat: context.gameState?.inCombat || false,
      currentQuest: context.gameState?.currentQuest,
      notes: context.gameState?.notes,
    },
  };
}

// ============================================
// CONTEXT EXPORT
// ============================================

/**
 * Context'i AI için prompt formatına çevirir
 */
export function contextToPrompt(context: GameContext): string {
  return buildContextPrompt(context);
}

/**
 * Context'i string formatında döndürür
 */
export function contextToString(context: GameContext): string {
  return JSON.stringify(context, null, 2);
}
