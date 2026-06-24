/**
 * Canonical item-type vocabulary shared across the AI tool executor,
 * the inventory endpoints, and the equipment-slot UI.
 *
 * Keeping a single source of truth here prevents the previous drift where the
 * AI `give_item` tool could only emit a subset of the types the equipment slots
 * actually support (so AI-granted loot could never fill head/hands/feet/etc.).
 */

export const ITEM_TYPES = [
  'Weapon',
  'Armor',
  'Shield',
  'Helmet',
  'Boots',
  'Gloves',
  'Cloak',
  'Ring',
  'Amulet',
  'Accessory',
  'Potion',
  'Scroll',
  'Tool',
  'Consumable',
  'Treasure',
  'Key',
  'Misc',
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ALLOWED_ITEM_TYPES: ReadonlySet<string> = new Set(ITEM_TYPES);

export function isAllowedItemType(value: unknown): value is ItemType {
  return typeof value === 'string' && ALLOWED_ITEM_TYPES.has(value);
}

/**
 * Equippable types and how many of each may be equipped at once.
 * (Two hands → up to two weapons; two ring fingers → two rings.)
 */
export const EQUIP_SLOT_LIMITS: Record<string, number> = {
  Weapon: 2,
  Shield: 1,
  Armor: 1,
  Helmet: 1,
  Boots: 1,
  Gloves: 1,
  Cloak: 1,
  Ring: 2,
  Amulet: 1,
  Accessory: 1,
};

export const EQUIPPABLE_TYPES: readonly string[] = Object.keys(EQUIP_SLOT_LIMITS);

export function isEquippableType(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(EQUIP_SLOT_LIMITS, type);
}

export function maxEquippedForType(type: string): number {
  return EQUIP_SLOT_LIMITS[type] ?? 0;
}
