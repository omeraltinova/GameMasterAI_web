/**
 * AI Tool Definitions for Game Master
 * OpenRouter function calling compatible tool schemas
 */

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

// NPC Creation Tool
export const createNpcTool: ToolDefinition = {
    type: 'function',
    function: {
        name: 'create_npc',
        description: 'Create a new NPC (Non-Player Character) when introducing a new character in the story. Use this whenever a new named character appears.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The name of the NPC (e.g., "Rodrick", "Lady Silverwind")',
                },
                role: {
                    type: 'string',
                    description: 'The role or occupation of the NPC (e.g., "Tavern Keeper", "Guard Captain", "Mysterious Stranger")',
                },
                race: {
                    type: 'string',
                    description: 'The race of the NPC (e.g., "Human", "Elf", "Dwarf", "Orc")',
                    enum: ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Other'],
                },
                personality: {
                    type: 'string',
                    description: 'A brief description of the NPC personality (e.g., "Grumpy but kind-hearted", "Mysterious and secretive")',
                },
                isHostile: {
                    type: 'boolean',
                    description: 'Whether the NPC is hostile/enemy to the player. Default is false.',
                },
            },
            required: ['name', 'role'],
        },
    },
};

// NPC Update Tool
export const updateNpcTool: ToolDefinition = {
    type: 'function',
    function: {
        name: 'update_npc',
        description: 'Update an existing NPC when their status, attitude, or information changes during the story.',
        parameters: {
            type: 'object',
            properties: {
                npcId: {
                    type: 'string',
                    description: 'The ID of the NPC to update',
                },
                personality: {
                    type: 'string',
                    description: 'Updated personality description',
                },
                isHostile: {
                    type: 'boolean',
                    description: 'Updated hostility status',
                },
                addDialogue: {
                    type: 'string',
                    description: 'A key dialogue line to remember from this interaction',
                },
            },
            required: ['npcId'],
        },
    },
};

// Give Item Tool
export const giveItemTool: ToolDefinition = {
    type: 'function',
    function: {
        name: 'give_item',
        description: 'Give an item from an NPC to the player character. Use this when an NPC gives, sells, or rewards the player with an item.',
        parameters: {
            type: 'object',
            properties: {
                itemName: {
                    type: 'string',
                    description: 'The name of the item being given',
                },
                itemType: {
                    type: 'string',
                    description: 'The type of item',
                    enum: ['Weapon', 'Armor', 'Shield', 'Potion', 'Scroll', 'Tool', 'Treasure', 'Key', 'Consumable', 'Misc'],
                },
                description: {
                    type: 'string',
                    description: 'A brief description of the item',
                },
                quantity: {
                    type: 'number',
                    description: 'How many of this item to give. Default is 1.',
                },
            },
            required: ['itemName', 'itemType'],
        },
    },
};

// Roll Dice Tool (for GM-initiated rolls)
export const rollDiceTool: ToolDefinition = {
    type: 'function',
    function: {
        name: 'request_dice_roll',
        description: 'Request the player to make a dice roll for a skill check, saving throw, or other action.',
        parameters: {
            type: 'object',
            properties: {
                diceType: {
                    type: 'string',
                    description: 'Type of dice to roll',
                    enum: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'],
                },
                skill: {
                    type: 'string',
                    description: 'The skill or ability being tested (e.g., "Perception", "Stealth", "Strength")',
                },
                dc: {
                    type: 'number',
                    description: 'The Difficulty Class (DC) the player needs to beat',
                },
                reason: {
                    type: 'string',
                    description: 'Why this roll is being requested',
                },
            },
            required: ['diceType', 'skill', 'dc', 'reason'],
        },
    },
};

// All available tools for GM
export const gmTools: ToolDefinition[] = [
    createNpcTool,
    updateNpcTool,
    giveItemTool,
    rollDiceTool,
];

// Tool call result type
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

// Parsed tool call arguments
export interface CreateNpcArgs {
    name: string;
    role: string;
    race?: string;
    personality?: string;
    isHostile?: boolean;
}

export interface UpdateNpcArgs {
    npcId: string;
    personality?: string;
    isHostile?: boolean;
    addDialogue?: string;
}

export interface GiveItemArgs {
    itemName: string;
    itemType: string;
    description?: string;
    quantity?: number;
}

export interface RequestDiceRollArgs {
    diceType: string;
    skill: string;
    dc: number;
    reason: string;
}
