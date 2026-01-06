/**
 * AI Tool Executor
 * Handles execution of tool calls from AI responses
 */

import { prisma } from '@/lib/db/prisma';
import type { ToolCall, CreateNpcArgs, UpdateNpcArgs, GiveItemArgs, RequestDiceRollArgs } from './tools';

export interface ToolExecutionResult {
    success: boolean;
    toolName: string;
    result?: any;
    error?: string;
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
    // Check if NPC with same name already exists in session
    const existingNpc = await prisma.nPC.findFirst({
        where: {
            sessionId,
            name: args.name,
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
                message: `NPC "${args.name}" already exists`,
            },
        };
    }

    // Create new NPC
    const npc = await prisma.nPC.create({
        data: {
            sessionId,
            name: args.name,
            role: args.role,
            race: args.race || null,
            personality: args.personality || null,
            isHostile: args.isHostile || false,
            dialogue: JSON.stringify([]),
        },
    });

    console.log(`[AI Tool] Created NPC: ${args.name} (${args.role})`);

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
    const npc = await prisma.nPC.findUnique({
        where: { id: args.npcId },
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

    if (args.personality !== undefined) {
        updateData.personality = args.personality;
    }

    if (args.isHostile !== undefined) {
        updateData.isHostile = args.isHostile;
    }

    if (args.addDialogue) {
        const existingDialogue = npc.dialogue ? JSON.parse(npc.dialogue) : [];
        existingDialogue.push({
            text: args.addDialogue,
            timestamp: new Date().toISOString(),
        });
        updateData.dialogue = JSON.stringify(existingDialogue);
    }

    if (Object.keys(updateData).length === 0) {
        return {
            success: true,
            toolName: 'update_npc',
            result: { npcId: args.npcId, updated: false },
        };
    }

    await prisma.nPC.update({
        where: { id: args.npcId },
        data: updateData,
    });

    console.log(`[AI Tool] Updated NPC: ${npc.name}`);

    return {
        success: true,
        toolName: 'update_npc',
        result: {
            npcId: args.npcId,
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
            name: args.itemName,
            type: args.itemType,
            description: args.description || null,
            quantity: args.quantity || 1,
            equipped: false,
            weight: 0,
        },
    });

    console.log(`[AI Tool] Gave item "${args.itemName}" to character ${character.name}`);

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
    console.log(`[AI Tool] Requesting dice roll: ${args.diceType} for ${args.skill} (DC ${args.dc})`);

    return {
        success: true,
        toolName: 'request_dice_roll',
        result: {
            diceType: args.diceType,
            skill: args.skill,
            dc: args.dc,
            reason: args.reason,
        },
    };
}
