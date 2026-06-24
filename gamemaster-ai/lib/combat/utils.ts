import type { Combat, CombatParticipant, CombatStatus } from "@/types";

const DEFAULT_PARTICIPANT_HP = 10;
const DEFAULT_PARTICIPANT_AC = 10;

export type CombatRecordLike = {
  id: string;
  sessionId: string;
  participants: string | CombatParticipant[];
  turnOrder: string | CombatParticipant[];
  currentTurn: number;
  round: number;
  status: string;
  log: string | string[] | null;
  createdAt: Date | string;
};

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toPositiveNumber(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

export function parseCharacterStats(rawStats: string | null | undefined) {
  if (typeof rawStats !== "string" || rawStats.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawStats) as Record<string, unknown>;
    return parsed;
  } catch {
    return {};
  }
}

export function calculateModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

// ── NPC combat-stat bounds ───────────────────────────────────────────────────
// NPC stats may originate from player-supplied JSON or from the LLM tool bridge,
// so the combat-relevant fields must be bounded before they reach the database
// and, later, the combat engine (which seeds enemy HP/AC from them).
export const MIN_NPC_HP = 1;
export const MAX_NPC_HP = 1000;
export const MIN_NPC_AC = 1;
export const MAX_NPC_AC = 30;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export const MIN_ATTACK_BONUS = -5;
export const MAX_ATTACK_BONUS = 20;

export interface NpcCombatStats {
  hp: number;
  maxHp: number;
  ac: number;
  attackBonus?: number;
  damageDice?: string;
}

/**
 * Reduces an untrusted NPC `stats` payload to a bounded combat-stat block
 * ({ hp, maxHp, ac, attackBonus?, damageDice? }). Returns null when no
 * combat-relevant field is present, so callers can persist `null`.
 */
export function sanitizeNpcCombatStats(rawStats: unknown): NpcCombatStats | null {
  if (!rawStats || typeof rawStats !== "object") {
    return null;
  }

  const stats = rawStats as Record<string, unknown>;
  const hasCombatField =
    stats.hp !== undefined ||
    stats.maxHp !== undefined ||
    stats.ac !== undefined ||
    stats.attackBonus !== undefined ||
    stats.damageDice !== undefined;
  if (!hasCombatField) {
    return null;
  }

  const maxHp = clampNumber(
    stats.maxHp ?? stats.hp,
    MIN_NPC_HP,
    MAX_NPC_HP,
    DEFAULT_PARTICIPANT_HP,
  );
  const hp = Math.min(maxHp, clampNumber(stats.hp ?? maxHp, 0, MAX_NPC_HP, maxHp));
  const ac = clampNumber(stats.ac, MIN_NPC_AC, MAX_NPC_AC, DEFAULT_PARTICIPANT_AC);

  const result: NpcCombatStats = { hp, maxHp, ac };

  if (stats.attackBonus !== undefined) {
    result.attackBonus = clampNumber(stats.attackBonus, MIN_ATTACK_BONUS, MAX_ATTACK_BONUS, 0);
  }
  if (typeof stats.damageDice === "string" && /^\d{1,2}d\d{1,3}$/i.test(stats.damageDice.trim())) {
    result.damageDice = stats.damageDice.trim().toLowerCase();
  }

  return result;
}

// ── Attack resolution (d20 + bonus vs AC → hit/crit → damage) ────────────────
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

// 5e proficiency bonus by character level: +2 (1-4), +3 (5-8), +4 (9-12)…
export function proficiencyBonus(level: number): number {
  const safeLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  return 2 + Math.floor((safeLevel - 1) / 4);
}

const ALLOWED_DAMAGE_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

/** Parses a "NdM" damage spec into a bounded { count, sides }. */
export function parseDamageDice(
  spec: string | undefined,
  fallback: { count: number; sides: number } = { count: 1, sides: 6 },
): { count: number; sides: number } {
  if (typeof spec === "string") {
    const match = spec.trim().toLowerCase().match(/^(\d{1,2})d(\d{1,3})$/);
    if (match) {
      const count = Math.min(20, Math.max(1, parseInt(match[1], 10)));
      const sidesRaw = parseInt(match[2], 10);
      const sides = ALLOWED_DAMAGE_SIDES.has(sidesRaw) ? sidesRaw : fallback.sides;
      return { count, sides };
    }
  }
  return fallback;
}

export interface AttackResolution {
  d20: number;
  attackRoll: number;
  attackBonus: number;
  targetAc: number;
  hit: boolean;
  crit: boolean;
  critMiss: boolean;
  damage: number;
  damageRolls: number[];
  breakdown: string;
}

/**
 * Resolves a single attack server-side. Natural 20 always hits and crits
 * (damage dice doubled); natural 1 always misses. Otherwise hit when
 * `d20 + attackBonus >= targetAc`. Damage = dice + damageBonus, never below 0.
 */
export function resolveAttack(params: {
  attackBonus: number;
  targetAc: number;
  damageDice: { count: number; sides: number };
  damageBonus: number;
  attackerName?: string;
  targetName?: string;
}): AttackResolution {
  const attackBonus = Math.round(params.attackBonus) || 0;
  const targetAc = Math.max(1, Math.round(params.targetAc) || DEFAULT_PARTICIPANT_AC);
  const d20 = rollDie(20);
  const crit = d20 === 20;
  const critMiss = d20 === 1;
  const attackRoll = d20 + attackBonus;
  const hit = crit || (!critMiss && attackRoll >= targetAc);

  const damageRolls: number[] = [];
  let damage = 0;
  if (hit) {
    const diceCount = crit ? params.damageDice.count * 2 : params.damageDice.count;
    for (let i = 0; i < diceCount; i++) {
      const roll = rollDie(params.damageDice.sides);
      damageRolls.push(roll);
      damage += roll;
    }
    damage = Math.max(0, damage + Math.round(params.damageBonus || 0));
  }

  const sign = attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`;
  let breakdown: string;
  if (critMiss) {
    breakdown = `🎯 Saldırı: d20[1] ${sign} → kritik ışkalama!`;
  } else if (!hit) {
    breakdown = `🎯 Saldırı: d20[${d20}] ${sign} = ${attackRoll} vs AC ${targetAc} → ışkaladı`;
  } else {
    breakdown =
      `🎯 Saldırı: d20[${d20}] ${sign} = ${attackRoll} vs AC ${targetAc} → ` +
      `${crit ? "💥 KRİTİK İSABET" : "isabet"}, ${damage} hasar`;
  }

  return { d20, attackRoll, attackBonus, targetAc, hit, crit, critMiss, damage, damageRolls, breakdown };
}

export function sanitizeParticipants(rawParticipants: unknown): CombatParticipant[] {
  // Accept both an already-parsed array and a raw JSON string. The Combat model
  // stores `participants`/`turnOrder` as JSON strings, and the combat-action and
  // next-turn routes pass those columns straight in — without string support this
  // returned [] for every request, breaking turn advancement and actions entirely.
  const source = Array.isArray(rawParticipants)
    ? rawParticipants
    : parseJsonArray<CombatParticipant>(rawParticipants);

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const participant = entry as Partial<CombatParticipant>;
      if (!participant.id || !participant.name) {
        return null;
      }

      const participantType = participant.type;
      const type: CombatParticipant["type"] =
        participantType === "enemy" || participantType === "ally" || participantType === "player"
          ? participantType
          : "enemy";

      const maxHp = Math.max(
        1,
        Math.round(toPositiveNumber(participant.maxHp, DEFAULT_PARTICIPANT_HP)),
      );
      const hp = Math.max(
        0,
        Math.min(maxHp, Math.round(toPositiveNumber(participant.hp, maxHp))),
      );
      const initiative = Math.round(toPositiveNumber(participant.initiative, 0));
      const ac = Math.max(1, Math.round(toPositiveNumber(participant.ac, DEFAULT_PARTICIPANT_AC)));

      return {
        id: participant.id,
        type,
        name: participant.name,
        initiative,
        hp,
        maxHp,
        ac,
      } satisfies CombatParticipant;
    })
    .filter((participant): participant is CombatParticipant => participant !== null);
}

export function normalizeCombatRecord(record: CombatRecordLike): Combat {
  const parsedParticipants = sanitizeParticipants(parseJsonArray<CombatParticipant>(record.participants));
  const parsedTurnOrder = sanitizeParticipants(parseJsonArray<CombatParticipant>(record.turnOrder));
  const resolvedTurnOrder = parsedTurnOrder.length > 0 ? parsedTurnOrder : parsedParticipants;
  const parsedLog = parseJsonArray<string>(record.log);

  const status: CombatStatus = record.status === "ended" ? "ended" : "active";

  return {
    id: record.id,
    sessionId: record.sessionId,
    participants: parsedParticipants,
    turnOrder: resolvedTurnOrder,
    currentTurn: Math.max(0, record.currentTurn || 0),
    round: Math.max(1, record.round || 1),
    status,
    log: parsedLog,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : record.createdAt.toISOString(),
  };
}

export function serializeParticipants(participants: CombatParticipant[]) {
  return JSON.stringify(participants);
}

export function serializeLog(log: string[]) {
  return JSON.stringify(log);
}

export function rollInitiative() {
  return Math.floor(Math.random() * 20) + 1;
}

