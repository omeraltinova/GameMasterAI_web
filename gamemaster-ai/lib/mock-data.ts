import type { User } from "@/types";

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

// ==========================================
// 5e SRD Reference Data
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


