import type {
  User,
  Character,
  Campaign,
  Scenario,
  Message,
  DiceRoll,
  InventoryItem,
  NPC,
  CampaignPlayer,
} from "@/types";

// ==========================================
// Mock Users
// ==========================================

export const mockCurrentUser: User = {
  id: "user_1",
  email: "adventurer@gamemaster.ai",
  username: "Adventurer",
  role: "MEMBER",
  avatar: "/images/avatars/default.png",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-20T15:30:00Z",
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: "user_2",
    email: "dungeon_master@gamemaster.ai",
    username: "DungeonMaster42",
    role: "MEMBER",
    createdAt: "2024-02-20T14:00:00Z",
    updatedAt: "2024-12-18T09:15:00Z",
  },
  {
    id: "user_3",
    email: "admin@gamemaster.ai",
    username: "GameMasterAdmin",
    role: "ADMIN",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-12-24T12:00:00Z",
  },
];

// ==========================================
// Mock Characters
// ==========================================

export const mockCharacters: Character[] = [
  {
    id: "char_1",
    userId: "user_1",
    name: "Thorin Ironforge",
    race: "Dwarf",
    class: "Fighter",
    level: 5,
    experience: 6500,
    hp: 45,
    maxHp: 52,
    stats: {
      strength: 18,
      dexterity: 12,
      constitution: 16,
      intelligence: 10,
      wisdom: 13,
      charisma: 8,
    },
    background: "Soldier - Once served in the King's Guard",
    imageUrl: "/images/characters/dwarf-fighter.png",
    createdAt: "2024-03-10T08:00:00Z",
    updatedAt: "2024-12-20T16:00:00Z",
  },
  {
    id: "char_2",
    userId: "user_1",
    name: "Elara Moonwhisper",
    race: "Elf",
    class: "Wizard",
    level: 4,
    experience: 3200,
    hp: 22,
    maxHp: 22,
    stats: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 15,
      charisma: 11,
    },
    background: "Sage - Researcher of ancient arcane secrets",
    imageUrl: "/images/characters/elf-wizard.png",
    createdAt: "2024-05-15T12:00:00Z",
    updatedAt: "2024-12-19T10:30:00Z",
  },
  {
    id: "char_3",
    userId: "user_1",
    name: "Shadow",
    race: "Halfling",
    class: "Rogue",
    level: 3,
    experience: 1800,
    hp: 21,
    maxHp: 21,
    stats: {
      strength: 10,
      dexterity: 18,
      constitution: 14,
      intelligence: 13,
      wisdom: 12,
      charisma: 14,
    },
    background: "Criminal - Former member of the Thieves Guild",
    createdAt: "2024-08-20T09:00:00Z",
    updatedAt: "2024-12-15T14:00:00Z",
  },
  {
    id: "char_4",
    userId: "user_2",
    name: "Sir Aldric",
    race: "Human",
    class: "Paladin",
    level: 6,
    experience: 14000,
    hp: 58,
    maxHp: 58,
    stats: {
      strength: 16,
      dexterity: 10,
      constitution: 14,
      intelligence: 10,
      wisdom: 13,
      charisma: 17,
    },
    background: "Noble - Sworn to uphold justice",
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-12-22T08:00:00Z",
  },
];

// ==========================================
// Mock Campaigns
// ==========================================

export const mockCampaigns: Campaign[] = [
  {
    id: "camp_1",
    name: "The Lost Mine of Phandelver",
    description: "A classic adventure for beginning players. Explore the ruins of Wave Echo Cave and uncover the secrets of the Forge of Spells.",
    creatorId: "user_1",
    scenarioId: "scen_1",
    isMultiplayer: true,
    maxPlayers: 4,
    inviteCode: "MINE2024",
    status: "ACTIVE",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-12-23T20:00:00Z",
    playerCount: 2,
  },
  {
    id: "camp_2",
    name: "Solo Adventure: The Haunted Manor",
    description: "A single-player mystery adventure. Investigate the strange occurrences at Blackwood Manor.",
    creatorId: "user_1",
    scenarioId: "scen_2",
    isMultiplayer: false,
    maxPlayers: 1,
    status: "ACTIVE",
    createdAt: "2024-10-15T14:00:00Z",
    updatedAt: "2024-12-20T18:00:00Z",
    playerCount: 1,
  },
  {
    id: "camp_3",
    name: "Dragon's Lair",
    description: "An epic quest to defeat the ancient red dragon Infernus.",
    creatorId: "user_2",
    isMultiplayer: true,
    maxPlayers: 6,
    inviteCode: "DRAGON99",
    status: "DRAFT",
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2024-12-01T08:00:00Z",
    playerCount: 0,
  },
];

// ==========================================
// Mock Scenarios
// ==========================================

export const mockScenarios: Scenario[] = [
  {
    id: "scen_1",
    title: "The Lost Mine of Phandelver",
    description: "More than five hundred years ago, clans of dwarves and gnomes made an agreement known as the Phandelver's Pact, by which they would share a rich mine in a wondrous cavern known as Wave Echo Cave.",
    genre: "Fantasy",
    difficulty: "Easy",
    startingPrompt: "You are on the road to Phandalin, escorting a wagon of supplies. The Triboar Trail has been quiet so far...",
    isOfficial: true,
    isAIGenerated: false,
    tags: ["dungeon", "dragon", "treasure", "beginner-friendly"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "scen_2",
    title: "The Haunted Manor",
    description: "Strange lights have been seen in the abandoned Blackwood Manor. The villagers speak of ghosts and curses. Will you uncover the truth?",
    genre: "Horror",
    difficulty: "Medium",
    startingPrompt: "The fog rolls thick as you approach the iron gates of Blackwood Manor. The villagers warned you not to come here after dark...",
    isOfficial: true,
    isAIGenerated: false,
    tags: ["horror", "mystery", "undead", "solo"],
    createdAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "scen_3",
    title: "The Dragon's Awakening",
    description: "An ancient dragon stirs from its thousand-year slumber. The prophecy speaks of heroes who will either save or doom the realm.",
    genre: "Fantasy",
    difficulty: "Hard",
    startingPrompt: "The ground trembles. In the distance, Mount Ashfall glows red against the night sky. The dragon has awakened...",
    isOfficial: true,
    isAIGenerated: false,
    tags: ["dragon", "epic", "high-level", "party"],
    createdAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "scen_4",
    title: "Tavern Tales",
    description: "A cozy one-shot adventure starting in a tavern. Perfect for new players to learn the ropes.",
    genre: "Adventure",
    difficulty: "Easy",
    startingPrompt: "The warm glow of the Prancing Pony tavern beckons you inside from the cold rain. The common room is alive with music and laughter...",
    isOfficial: false,
    isAIGenerated: true,
    creatorId: "user_1",
    tags: ["tavern", "one-shot", "beginner"],
    createdAt: "2024-11-20T00:00:00Z",
  },
];

// ==========================================
// Mock Messages
// ==========================================

export const mockMessages: Message[] = [
  {
    id: "msg_1",
    sessionId: "sess_1",
    senderType: "GM",
    senderName: "Game Master",
    content: "You find yourselves at the entrance of the Goblin Hideout. The cave mouth yawns before you, dark and foreboding. You can hear the distant sound of guttural voices echoing from within. What do you do?",
    timestamp: "2024-12-20T15:00:00Z",
  },
  {
    id: "msg_2",
    sessionId: "sess_1",
    senderId: "user_1",
    senderType: "PLAYER",
    senderName: "Thorin Ironforge",
    content: "I carefully approach the entrance and try to listen for any movement nearby.",
    timestamp: "2024-12-20T15:01:00Z",
  },
  {
    id: "msg_3",
    sessionId: "sess_1",
    senderType: "SYSTEM",
    content: "Thorin Ironforge makes a Perception check.",
    timestamp: "2024-12-20T15:01:30Z",
  },
  {
    id: "msg_4",
    sessionId: "sess_1",
    senderType: "DICE",
    senderName: "Thorin Ironforge",
    content: "🎲 Perception Check: d20 (15) + 1 = **16**",
    metadata: { diceType: "d20", result: 15, modifier: 1, total: 16 },
    timestamp: "2024-12-20T15:01:35Z",
  },
  {
    id: "msg_5",
    sessionId: "sess_1",
    senderType: "GM",
    senderName: "Game Master",
    content: "With a roll of 16, you successfully detect the presence of at least two goblins just inside the cave entrance. They seem to be arguing about something in their crude language. You have the element of surprise if you act quickly.",
    timestamp: "2024-12-20T15:02:00Z",
  },
];

// ==========================================
// Mock Dice Rolls
// ==========================================

export const mockDiceRolls: DiceRoll[] = [
  {
    id: "roll_1",
    sessionId: "sess_1",
    characterId: "char_1",
    characterName: "Thorin Ironforge",
    diceType: "d20",
    count: 1,
    results: [15],
    modifier: 1,
    total: 16,
    purpose: "Perception Check",
    timestamp: "2024-12-20T15:01:35Z",
  },
  {
    id: "roll_2",
    sessionId: "sess_1",
    characterId: "char_1",
    characterName: "Thorin Ironforge",
    diceType: "d20",
    count: 1,
    results: [18],
    modifier: 6,
    total: 24,
    purpose: "Attack Roll (Battleaxe)",
    timestamp: "2024-12-20T15:05:00Z",
  },
  {
    id: "roll_3",
    sessionId: "sess_1",
    characterId: "char_1",
    characterName: "Thorin Ironforge",
    diceType: "d8",
    count: 1,
    results: [6],
    modifier: 4,
    total: 10,
    purpose: "Damage (Battleaxe)",
    timestamp: "2024-12-20T15:05:15Z",
  },
];

// ==========================================
// Mock Inventory Items
// ==========================================

export const mockInventoryItems: InventoryItem[] = [
  {
    id: "item_1",
    characterId: "char_1",
    name: "Battleaxe",
    type: "Weapon",
    description: "A well-crafted dwarven battleaxe with runes etched into the blade.",
    quantity: 1,
    properties: {
      damage: "1d8",
      damageType: "slashing",
      properties: ["versatile (1d10)"],
    },
    equipped: true,
    weight: 4,
  },
  {
    id: "item_2",
    characterId: "char_1",
    name: "Chain Mail",
    type: "Armor",
    description: "Standard issue chain mail armor.",
    quantity: 1,
    properties: {
      armorClass: 16,
    },
    equipped: true,
    weight: 55,
  },
  {
    id: "item_3",
    characterId: "char_1",
    name: "Healing Potion",
    type: "Potion",
    description: "A red liquid that glimmers when agitated. Restores 2d4+2 hit points.",
    quantity: 2,
    properties: {
      healing: "2d4+2",
    },
    equipped: false,
    weight: 0.5,
  },
  {
    id: "item_4",
    characterId: "char_1",
    name: "Rope (50 feet)",
    type: "Tool",
    description: "Hempen rope, useful for climbing and binding.",
    quantity: 1,
    equipped: false,
    weight: 10,
  },
  {
    id: "item_5",
    characterId: "char_1",
    name: "Gold Pieces",
    type: "Misc",
    description: "Standard currency.",
    quantity: 45,
    equipped: false,
    weight: 0,
  },
];

// ==========================================
// Mock NPCs
// ==========================================

export const mockNPCs: NPC[] = [
  {
    id: "npc_1",
    sessionId: "sess_1",
    name: "Sildar Hallwinter",
    race: "Human",
    role: "Ally",
    personality: "Brave and honorable. A member of the Lords' Alliance.",
    isHostile: false,
    createdAt: "2024-12-20T14:00:00Z",
  },
  {
    id: "npc_2",
    sessionId: "sess_1",
    name: "Goblin Scout",
    race: "Goblin",
    role: "Enemy",
    personality: "Cowardly but cunning. Will flee if cornered.",
    stats: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
    },
    isHostile: true,
    createdAt: "2024-12-20T15:00:00Z",
  },
  {
    id: "npc_3",
    sessionId: "sess_1",
    name: "Gundren Rockseeker",
    race: "Dwarf",
    role: "Quest Giver",
    personality: "Enthusiastic and secretive about his discovery.",
    isHostile: false,
    createdAt: "2024-12-20T14:00:00Z",
  },
];

// ==========================================
// Mock Campaign Players
// ==========================================

export const mockCampaignPlayers: CampaignPlayer[] = [
  {
    id: "cp_1",
    campaignId: "camp_1",
    userId: "user_1",
    characterId: "char_1",
    character: mockCharacters[0],
    user: { id: "user_1", username: "Adventurer", avatar: "/images/avatars/default.png" },
    joinedAt: "2024-06-01T10:00:00Z",
    isActive: true,
  },
  {
    id: "cp_2",
    campaignId: "camp_1",
    userId: "user_2",
    characterId: "char_4",
    character: mockCharacters[3],
    user: { id: "user_2", username: "DungeonMaster42" },
    joinedAt: "2024-06-02T14:00:00Z",
    isActive: true,
  },
];

// ==========================================
// D&D Data
// ==========================================

export const races = [
  { name: "Human", description: "Versatile and ambitious", bonuses: "+1 to all ability scores" },
  { name: "Elf", description: "Graceful and long-lived", bonuses: "+2 Dexterity" },
  { name: "Dwarf", description: "Hardy and stalwart", bonuses: "+2 Constitution" },
  { name: "Halfling", description: "Small and nimble", bonuses: "+2 Dexterity" },
  { name: "Dragonborn", description: "Proud dragon descendants", bonuses: "+2 Strength, +1 Charisma" },
  { name: "Gnome", description: "Clever and curious", bonuses: "+2 Intelligence" },
  { name: "Half-Elf", description: "Best of both worlds", bonuses: "+2 Charisma, +1 to two others" },
  { name: "Half-Orc", description: "Strong and fierce", bonuses: "+2 Strength, +1 Constitution" },
  { name: "Tiefling", description: "Infernal heritage", bonuses: "+2 Charisma, +1 Intelligence" },
];

export const classes = [
  { name: "Fighter", description: "Master of martial combat", hitDie: "d10", primaryAbility: "Strength or Dexterity" },
  { name: "Wizard", description: "Scholarly magic user", hitDie: "d6", primaryAbility: "Intelligence" },
  { name: "Rogue", description: "Stealthy and skilled", hitDie: "d8", primaryAbility: "Dexterity" },
  { name: "Cleric", description: "Divine spellcaster", hitDie: "d8", primaryAbility: "Wisdom" },
  { name: "Ranger", description: "Wilderness warrior", hitDie: "d10", primaryAbility: "Dexterity and Wisdom" },
  { name: "Paladin", description: "Holy warrior", hitDie: "d10", primaryAbility: "Strength and Charisma" },
  { name: "Barbarian", description: "Primal warrior", hitDie: "d12", primaryAbility: "Strength" },
  { name: "Bard", description: "Magical performer", hitDie: "d8", primaryAbility: "Charisma" },
  { name: "Druid", description: "Nature's guardian", hitDie: "d8", primaryAbility: "Wisdom" },
  { name: "Monk", description: "Martial artist", hitDie: "d8", primaryAbility: "Dexterity and Wisdom" },
  { name: "Sorcerer", description: "Innate magic user", hitDie: "d6", primaryAbility: "Charisma" },
  { name: "Warlock", description: "Pact magic wielder", hitDie: "d8", primaryAbility: "Charisma" },
];

export const backgrounds = [
  "Acolyte",
  "Criminal",
  "Folk Hero",
  "Noble",
  "Sage",
  "Soldier",
  "Entertainer",
  "Guild Artisan",
  "Hermit",
  "Outlander",
];


