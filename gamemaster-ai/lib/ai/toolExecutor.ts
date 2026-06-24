/**
 * AI Tool Executor
 * Handles execution of tool calls from AI responses
 */

import { prisma } from '@/lib/db/prisma';
import { ALLOWED_ITEM_TYPES } from '@/lib/game/items';
import { sanitizeNpcCombatStats } from '@/lib/combat/utils';
import type { ToolCall, CreateNpcArgs, UpdateNpcArgs, GiveItemArgs, RequestDiceRollArgs } from './tools';

export interface ToolExecutionResult {
    success: boolean;
    toolName: string;
    result?: any;
    error?: string;
}

// ── Tool-argument safety bounds ──────────────────────────────────────────────
// AI tool args originate from JSON.parse(model output) and are therefore
// attacker-influenceable via prompt injection. These helpers coerce every value
// to a safe, bounded representation before it reaches the database, regardless
// of what the model emits.
const MAX_ITEM_NAME_LENGTH = 80;
const MAX_ITEM_DESCRIPTION_LENGTH = 500;
const MIN_ITEM_QUANTITY = 1;
const MAX_ITEM_QUANTITY = 20;
const MAX_NPC_NAME_LENGTH = 80;
const MAX_NPC_ROLE_LENGTH = 80;
const MAX_NPC_PERSONALITY_LENGTH = 500;
const MAX_DIALOGUE_LENGTH = 1000;
const MAX_SKILL_LENGTH = 60;
const MAX_REASON_LENGTH = 200;
const MIN_DC = 1;
const MAX_DC = 40;

const ALLOWED_NPC_RACES = new Set([
    'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
    'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Other',
]);
const ALLOWED_DICE_TYPES = new Set(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);

function asUnknownRecord(args: unknown): Record<string, unknown> {
    return (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
}

function cleanString(value: unknown, max: number): string {
    if (typeof value !== 'string') return '';
    return value.slice(0, max);
}

function optionalString(value: unknown, max: number): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.slice(0, max);
    return trimmed.length === 0 ? null : trimmed;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
    return Math.min(max, Math.max(min, n));
}

function coerceBoolean(value: unknown): boolean {
    return value === true;
}

/**
 * Execute a single tool call
 */
export async function executeToolCall(
    toolCall: ToolCall,
    sessionId: string,
    characterId?: string
): Promise<ToolExecutionResult> {
    const toolName = toolCall.function.name;

    try {
        const args = JSON.parse(toolCall.function.arguments);

        switch (toolName) {
            case 'create_npc':
                return await executeCreateNpc(args, sessionId);
            case 'update_npc':
                return await executeUpdateNpc(args, sessionId);
            case 'give_item':
                return await executeGiveItem(args, characterId);
            case 'request_dice_roll':
                return executeRequestDiceRoll(args);
            default:
                return {
                    success: false,
                    toolName,
                    error: `Unknown tool: ${toolName}`,
                };
        }
    } catch (error: any) {
        console.error(`Tool execution error (${toolName}):`, error);
        return {
            success: false,
            toolName,
            error: error.message || 'Tool execution failed',
        };
    }
}

/**
 * Execute multiple tool calls in sequence
 */
export async function executeToolCalls(
    toolCalls: ToolCall[],
    sessionId: string,
    characterId?: string
): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
        const result = await executeToolCall(toolCall, sessionId, characterId);
        results.push(result);
    }

    return results;
}

/**
 * Create NPC
 */
async function executeCreateNpc(
    args: CreateNpcArgs,
    sessionId: string
): Promise<ToolExecutionResult> {
    const a = asUnknownRecord(args);
    const name = cleanString(a.name, MAX_NPC_NAME_LENGTH).trim();
    const role = cleanString(a.role, MAX_NPC_ROLE_LENGTH).trim();

    if (!name || !role) {
        return {
            success: false,
            toolName: 'create_npc',
            error: 'Geçersiz NPC adı veya rolü',
        };
    }

    const rawRace = typeof a.race === 'string' ? (a.race as string) : '';
    const race = rawRace && ALLOWED_NPC_RACES.has(rawRace) ? rawRace : null;
    const personality = optionalString(a.personality, MAX_NPC_PERSONALITY_LENGTH);
    const isHostile = coerceBoolean(a.isHostile);
    // Bounded combat stats so AI-created enemies are not all identical (10/10/10)
    // when combat seeds HP/AC from NPC.stats. Defaults to a sensible block for
    // hostile NPCs even if the model omits stats.
    const providedStats = sanitizeNpcCombatStats({
        hp: a.hp,
        maxHp: a.maxHp,
        ac: a.ac,
        attackBonus: a.attackBonus,
        damageDice: a.damageDice,
    });
    const combatStats = providedStats ?? (isHostile ? { hp: 10, maxHp: 10, ac: 10 } : null);

    // Check if NPC with same name already exists in session
    const existingNpc = await prisma.nPC.findFirst({
        where: {
            sessionId,
            name,
        },
    });

    if (existingNpc) {
        // NPC already exists, return existing one
        return {
            success: true,
            toolName: 'create_npc',
            result: {
                npcId: existingNpc.id,
                name: existingNpc.name,
                isNew: false,
                message: `NPC "${name}" already exists`,
            },
        };
    }

    // Create new NPC
    const npc = await prisma.nPC.create({
        data: {
            sessionId,
            name,
            role,
            race,
            personality,
            isHostile,
            stats: combatStats ? JSON.stringify(combatStats) : null,
            dialogue: JSON.stringify([]),
        },
    });

    console.log(`[AI Tool] Created NPC: ${name} (${role})`);

    return {
        success: true,
        toolName: 'create_npc',
        result: {
            npcId: npc.id,
            name: npc.name,
            role: npc.role,
            isNew: true,
        },
    };
}

/**
 * Update NPC
 */
async function executeUpdateNpc(
    args: UpdateNpcArgs,
    sessionId: string
): Promise<ToolExecutionResult> {
    const a = asUnknownRecord(args);
    const npcId = typeof a.npcId === 'string' ? a.npcId : '';

    if (!npcId) {
        return {
            success: false,
            toolName: 'update_npc',
            error: 'NPC not found',
        };
    }

    const npc = await prisma.nPC.findUnique({
        where: { id: npcId },
    });

    if (!npc || npc.sessionId !== sessionId) {
        return {
            success: false,
            toolName: 'update_npc',
            error: 'NPC not found',
        };
    }

    // Build update data
    const updateData: any = {};

    if (a.personality !== undefined) {
        updateData.personality = optionalString(a.personality, MAX_NPC_PERSONALITY_LENGTH);
    }

    if (a.isHostile !== undefined) {
        updateData.isHostile = coerceBoolean(a.isHostile);
    }

    if (a.addDialogue !== undefined && a.addDialogue !== null) {
        const dialogueLine = cleanString(a.addDialogue, MAX_DIALOGUE_LENGTH);
        if (dialogueLine.length > 0) {
            const existingDialogue = npc.dialogue ? JSON.parse(npc.dialogue) : [];
            existingDialogue.push({
                text: dialogueLine,
                timestamp: new Date().toISOString(),
            });
            updateData.dialogue = JSON.stringify(existingDialogue);
        }
    }

    if (Object.keys(updateData).length === 0) {
        return {
            success: true,
            toolName: 'update_npc',
            result: { npcId, updated: false },
        };
    }

    await prisma.nPC.update({
        where: { id: npcId },
        data: updateData,
    });

    console.log(`[AI Tool] Updated NPC: ${npc.name}`);

    return {
        success: true,
        toolName: 'update_npc',
        result: {
            npcId,
            updated: true,
        },
    };
}

/**
 * Give Item to Character
 */
async function executeGiveItem(
    args: GiveItemArgs,
    characterId?: string
): Promise<ToolExecutionResult> {
    if (!characterId) {
        return {
            success: false,
            toolName: 'give_item',
            error: 'No character specified',
        };
    }

    const a = asUnknownRecord(args);
    const itemName = cleanString(a.itemName, MAX_ITEM_NAME_LENGTH).trim();
    const rawType = typeof a.itemType === 'string' ? (a.itemType as string) : '';
    const itemType = rawType && ALLOWED_ITEM_TYPES.has(rawType) ? rawType : 'Misc';

    if (!itemName) {
        return {
            success: false,
            toolName: 'give_item',
            error: 'Geçersiz eşya adı',
        };
    }

    const description = optionalString(a.description, MAX_ITEM_DESCRIPTION_LENGTH);
    const quantity = clampInt(a.quantity, MIN_ITEM_QUANTITY, MAX_ITEM_QUANTITY, 1);

    // Check if character exists
    const character = await prisma.character.findUnique({
        where: { id: characterId },
    });

    if (!character) {
        return {
            success: false,
            toolName: 'give_item',
            error: 'Character not found',
        };
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
        data: {
            characterId,
            name: itemName,
            type: itemType,
            description,
            quantity,
            equipped: false,
            weight: 0,
        },
    });

    console.log(`[AI Tool] Gave item "${itemName}" (x${quantity}) to character ${character.name}`);

    return {
        success: true,
        toolName: 'give_item',
        result: {
            itemId: item.id,
            itemName: item.name,
            quantity: item.quantity,
        },
    };
}

/**
 * Request Dice Roll (this just returns the request, UI handles the actual roll)
 */
function executeRequestDiceRoll(
    args: RequestDiceRollArgs
): ToolExecutionResult {
    const a = asUnknownRecord(args);
    const rawDiceType = typeof a.diceType === 'string' ? (a.diceType as string) : '';
    const diceType = rawDiceType && ALLOWED_DICE_TYPES.has(rawDiceType) ? rawDiceType : 'd20';
    const skill = cleanString(a.skill, MAX_SKILL_LENGTH).trim() || 'Bilinmeyen';
    const dc = clampInt(a.dc, MIN_DC, MAX_DC, 10);
    const reason = cleanString(a.reason, MAX_REASON_LENGTH).trim();

    console.log(`[AI Tool] Requesting dice roll: ${diceType} for ${skill} (DC ${dc})`);

    return {
        success: true,
        toolName: 'request_dice_roll',
        result: {
            diceType,
            skill,
            dc,
            reason,
        },
    };
}
