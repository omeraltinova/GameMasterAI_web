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

export function sanitizeParticipants(rawParticipants: unknown): CombatParticipant[] {
  if (!Array.isArray(rawParticipants)) {
    return [];
  }

  return rawParticipants
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

