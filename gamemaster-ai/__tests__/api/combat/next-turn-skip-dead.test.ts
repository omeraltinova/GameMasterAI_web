import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    combat: { findUnique: vi.fn(), update: vi.fn() },
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
import { POST as nextTurn } from "@/app/api/combat/[id]/next-turn/route";

function participant(id: string, initiative: number, hp: number) {
  return { id, name: id, type: "enemy", initiative, hp, maxHp: 10, ac: 10 };
}

function makeCombat(currentTurn: number, order: ReturnType<typeof participant>[]) {
  return {
    id: "combat-1",
    sessionId: "s1",
    status: "active",
    currentTurn,
    round: 1,
    participants: JSON.stringify(order),
    turnOrder: JSON.stringify(order),
    log: JSON.stringify([]),
    createdAt: new Date(),
    session: { id: "s1", campaign: { creatorId: "gm-1", players: [] } },
  };
}

const params = Promise.resolve({ id: "combat-1" });
const req = () =>
  new NextRequest("http://localhost:3000/api/combat/combat-1/next-turn", { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("gm-1");
  mocks.prisma.gameSession.update.mockResolvedValue({});
  mocks.prisma.message.create.mockResolvedValue({});
  mocks.prisma.combat.update.mockImplementation(async ({ data }: any) => ({
    ...makeCombat(data.currentTurn, [participant("A", 20, 10), participant("B", 15, 0), participant("C", 10, 10)]),
    ...data,
  }));
});

describe("POST /api/combat/[id]/next-turn — skip defeated combatants", () => {
  it("skips a 0-HP combatant and lands on the next living one", async () => {
    const order = [participant("A", 20, 10), participant("B", 15, 0), participant("C", 10, 10)];
    mocks.prisma.combat.findUnique.mockResolvedValue(makeCombat(0, order));

    const res = await nextTurn(req(), { params });
    expect(res.status).toBe(200);

    const data = mocks.prisma.combat.update.mock.calls[0][0].data;
    expect(data.currentTurn).toBe(2); // B (index 1) is dead → skip to C (index 2)
    expect(data.round).toBe(1);
  });

  it("wraps to the top and starts a new round", async () => {
    const order = [participant("A", 20, 10), participant("B", 15, 0), participant("C", 10, 10)];
    mocks.prisma.combat.findUnique.mockResolvedValue(makeCombat(2, order));

    const res = await nextTurn(req(), { params });
    expect(res.status).toBe(200);

    const data = mocks.prisma.combat.update.mock.calls[0][0].data;
    expect(data.currentTurn).toBe(0); // C was last → wrap to A
    expect(data.round).toBe(2);
  });

  it("advances a single slot when no combatant is alive", async () => {
    const order = [participant("A", 20, 0), participant("B", 15, 0), participant("C", 10, 0)];
    mocks.prisma.combat.findUnique.mockResolvedValue(makeCombat(0, order));

    const res = await nextTurn(req(), { params });
    expect(res.status).toBe(200);

    const data = mocks.prisma.combat.update.mock.calls[0][0].data;
    expect(data.currentTurn).toBe(1); // no living target → just advance one
  });
});
