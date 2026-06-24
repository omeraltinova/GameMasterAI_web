import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    combat: { findUnique: vi.fn() },
    character: { findUnique: vi.fn() },
    nPC: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    combat: { updateMany: vi.fn(), findUnique: vi.fn() },
    gameSession: { update: vi.fn() },
    message: { create: vi.fn() },
  },
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, error: "auth" }, { status: 401 });
  },
  forbiddenResponse: (msg: string) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  },
}));
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockResolvedValue(null),
  RATE_LIMIT_TIERS: { GAME_ACTION: { windowMs: 60000, max: 60 } },
}));

import { NextRequest } from "next/server";
import { POST as combatAction } from "@/app/api/combat/[id]/action/route";

function participant(id: string, type: string, hp: number) {
  return { id, name: id, type, initiative: 10, hp, maxHp: 10, ac: 10 };
}

const params = Promise.resolve({ id: "combat-1" });

// turnOrder: enemy E acts first, then player P
const order = [participant("E", "enemy", 10), participant("P", "player", 10)];

function combatRecord() {
  return {
    id: "combat-1",
    sessionId: "s1",
    status: "active",
    currentTurn: 0, // E's turn
    round: 1,
    participants: JSON.stringify(order),
    turnOrder: JSON.stringify(order),
    log: JSON.stringify([]),
    createdAt: new Date(),
    session: {
      id: "s1",
      currentState: "{}",
      campaign: {
        creatorId: "gm-1",
        players: [{ userId: "player-1", characterId: "P" }],
      },
    },
  };
}

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/combat/combat-1/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.combat.findUnique.mockResolvedValue(combatRecord());
  mocks.prisma.$transaction.mockImplementation(async (cb: any) => cb(mocks.tx));
  mocks.tx.combat.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.combat.findUnique.mockImplementation(async () => combatRecord());
  mocks.tx.gameSession.update.mockResolvedValue({});
  mocks.tx.message.create.mockResolvedValue({});
});

describe("POST /api/combat/[id]/action", () => {
  it("resolves the current actor from the JSON turnOrder and applies GM damage", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");

    const res = await combatAction(
      makeReq({ action: "Kılıç salla", actorId: "E", targetId: "P", damage: 5 }),
      { params }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Optimistic compare-and-set ran, and the persisted participants reflect 5 damage to P.
    expect(mocks.tx.combat.updateMany).toHaveBeenCalledOnce();
    const writtenParticipants = JSON.parse(mocks.tx.combat.updateMany.mock.calls[0][0].data.participants);
    const targetP = writtenParticipants.find((p: any) => p.id === "P");
    expect(targetP.hp).toBe(5);
  });

  it("rejects a player acting on an enemy's turn", async () => {
    mocks.getUserId.mockResolvedValue("player-1");

    const res = await combatAction(
      makeReq({ action: "saldır", actorId: "E", targetId: "P", damage: 5 }),
      { params }
    );
    expect(res.status).toBe(403);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("lets a player attack an enemy on their turn (server resolves the roll)", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    // P's turn (turnOrder index 1)
    mocks.prisma.combat.findUnique.mockResolvedValue({ ...combatRecord(), currentTurn: 1 });
    mocks.prisma.character.findUnique.mockResolvedValue({
      level: 1,
      stats: JSON.stringify({ strength: 10, dexterity: 10 }),
      inventoryItems: [],
    });
    // Force a crit hit + max damage: random 0.99 → d20 = 20, 1d4 → 4 each (crit → 2d4 = 8)
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    const res = await combatAction(
      makeReq({ action: "Saldırıyorum", actorId: "P", targetId: "E", attack: true }),
      { params }
    );
    expect(res.status).toBe(200);

    const written = JSON.parse(mocks.tx.combat.updateMany.mock.calls[0][0].data.participants);
    const enemy = written.find((p: any) => p.id === "E");
    expect(enemy.hp).toBe(2); // 10 HP − 8 crit damage

    randomSpy.mockRestore();
  });

  it("a player attack that misses deals no damage", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    mocks.prisma.combat.findUnique.mockResolvedValue({ ...combatRecord(), currentTurn: 1 });
    mocks.prisma.character.findUnique.mockResolvedValue({
      level: 1,
      stats: JSON.stringify({ strength: 10, dexterity: 10 }),
      inventoryItems: [],
    });
    // random 0.0 → d20 = 1 → critical miss
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const res = await combatAction(
      makeReq({ action: "Saldırıyorum", actorId: "P", targetId: "E", attack: true }),
      { params }
    );
    expect(res.status).toBe(200);

    const written = JSON.parse(mocks.tx.combat.updateMany.mock.calls[0][0].data.participants);
    const enemy = written.find((p: any) => p.id === "E");
    expect(enemy.hp).toBe(10); // missed → unchanged

    randomSpy.mockRestore();
  });
});
