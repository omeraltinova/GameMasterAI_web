// ==========================================
// User Types
// ==========================================

export type UserRole = "VISITOR" | "MEMBER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Character Types
// ==========================================

export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type CharacterRace = 
  | "Human" 
  | "Elf" 
  | "Dwarf" 
  | "Halfling" 
  | "Dragonborn" 
  | "Gnome" 
  | "Half-Elf" 
  | "Half-Orc" 
  | "Tiefling";

export type CharacterClass = 
  | "Fighter" 
  | "Wizard" 
  | "Rogue" 
  | "Cleric" 
  | "Ranger" 
  | "Paladin" 
  | "Barbarian" 
  | "Bard" 
  | "Druid" 
  | "Monk" 
  | "Sorcerer" 
  | "Warlock";

export interface Character {
  id: string;
  userId: string;
  campaignId?: string;
  name: string;
  race: CharacterRace;
  class: CharacterClass;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  stats: CharacterStats;
  background?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Inventory Types
// ==========================================

export type ItemType = "Weapon" | "Armor" | "Potion" | "Scroll" | "Tool" | "Misc" | "Quest";

export interface ItemProperties {
  damage?: string;
  damageType?: string;
  armorClass?: number;
  healing?: string;
  range?: string;
  properties?: string[];
}

export interface InventoryItem {
  id: string;
  characterId: string;
  name: string;
  type: ItemType;
  description?: string;
  quantity: number;
  properties?: ItemProperties;
  equipped: boolean;
  weight: number;
}

// ==========================================
// Campaign Types
// ==========================================

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  scenarioId?: string;
  isMultiplayer: boolean;
  maxPlayers: number;
  inviteCode?: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  playerCount?: number;
}

// ==========================================
// Scenario Types
// ==========================================

export type ScenarioGenre = "Fantasy" | "Horror" | "Sci-Fi" | "Mystery" | "Adventure";
export type ScenarioDifficulty = "Easy" | "Medium" | "Hard";

export interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: ScenarioGenre;
  difficulty: ScenarioDifficulty;
  startingPrompt: string;
  isOfficial: boolean;
  isAIGenerated: boolean;
  creatorId?: string;
  tags?: string[];
  createdAt: string;
}

// ==========================================
// Game Session Types
// ==========================================

export interface GameState {
  location: string;
  timeOfDay: string;
  weather?: string;
  activeNPCs: string[];
  activeQuests: string[];
  notes?: string;
}

export interface GameSession {
  id: string;
  campaignId: string;
  currentState: GameState;
  turnOrder?: string[];
  activePlayer?: string;
  aiContext?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Message Types
// ==========================================

export type MessageSenderType = "PLAYER" | "GM" | "SYSTEM" | "DICE" | "COMBAT";

export interface Message {
  id: string;
  sessionId: string;
  senderId?: string;
  senderType: MessageSenderType;
  senderName?: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ==========================================
// Dice Types
// ==========================================

export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

export interface DiceRoll {
  id: string;
  sessionId: string;
  characterId?: string;
  characterName?: string;
  diceType: DiceType;
  count: number;
  results: number[];
  modifier: number;
  total: number;
  purpose?: string;
  timestamp: string;
}

// ==========================================
// NPC Types
// ==========================================

export interface NPC {
  id: string;
  sessionId: string;
  name: string;
  race?: string;
  role: string;
  personality?: string;
  stats?: Partial<CharacterStats>;
  isHostile: boolean;
  dialogue?: string[];
  imageUrl?: string;
  createdAt: string;
}

// ==========================================
// Combat Types
// ==========================================

export type CombatStatus = "active" | "ended";

export interface CombatParticipant {
  id: string;
  type: "player" | "enemy" | "ally";
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
}

export interface Combat {
  id: string;
  sessionId: string;
  participants: CombatParticipant[];
  turnOrder: CombatParticipant[];
  currentTurn: number;
  round: number;
  status: CombatStatus;
  log?: string[];
  createdAt: string;
}

// ==========================================
// Map Types
// ==========================================

export interface GameMap {
  id: string;
  sessionId: string;
  name?: string;
  description?: string;
  imageUrl: string;
  isAIGenerated: boolean;
  prompt?: string;
  createdAt: string;
}

// ==========================================
// Campaign Player Types
// ==========================================

export interface CampaignPlayer {
  id: string;
  campaignId: string;
  userId: string;
  characterId: string;
  character?: Character;
  user?: Pick<User, "id" | "username" | "avatar">;
  joinedAt: string;
  isActive: boolean;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// Form Input Types
// ==========================================

export interface CreateCharacterInput {
  name: string;
  race: CharacterRace;
  class: CharacterClass;
  stats: CharacterStats;
  background?: string;
  imageUrl?: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  scenarioId?: string;
  isMultiplayer: boolean;
  maxPlayers: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}


