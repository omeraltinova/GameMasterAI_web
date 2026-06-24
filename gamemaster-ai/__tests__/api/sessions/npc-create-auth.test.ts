import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    nPC: { create: vi.fn() },
  },
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/server", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockResolvedValue(null),
  RATE_LIMIT_TIERS: { READ: { windowMs: 60000, max: 100 }, WRITE: { windowMs: 60000, max: 30 } },
}));

import { NextRequest } from "next/server";
import { POST as createNpc } from "@/app/api/sessions/[id]/npcs/route";

const params = Promise.resolve({ id: "s1" });

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/sessions/s1/npcs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function session(creatorId: string, players: { userId: string }[] = []) {
  return { id: "s1", campaign: { creatorId, players } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.nPC.create.mockResolvedValue({ id: "npc-1", name: "Ogre", stats: null });
});

describe("POST /api/sessions/[id]/npcs — GM-only + stat sanitization", () => {
  it("forbids a regular player (non-GM) from creating NPCs", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue(
      session("gm-1", [{ userId: "player-1" }])
    );

    const res = await createNpc(makeReq({ name: "Ogre", role: "Brute" }), { params });
    expect(res.status).toBe(403);
    expect(mocks.prisma.nPC.create).not.toHaveBeenCalled();
  });

  it("forbids a non-member entirely", async () => {
    mocks.getUserId.mockResolvedValue("stranger");
    mocks.prisma.gameSession.findUnique.mockResolvedValue(session("gm-1", []));

    const res = await createNpc(makeReq({ name: "Ogre", role: "Brute" }), { params });
    expect(res.status).toBe(403);
    expect(mocks.prisma.nPC.create).not.toHaveBeenCalled();
  });

  it("lets the GM create an NPC and clamps out-of-range combat stats", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue(session("gm-1", []));

    const res = await createNpc(
      makeReq({ name: "Ogre", role: "Brute", isHostile: true, stats: { hp: 999999, ac: 99 } }),
      { params }
    );
    expect(res.status).toBe(200);

    const data = mocks.prisma.nPC.create.mock.calls[0][0].data;
    expect(JSON.parse(data.stats)).toEqual({ hp: 1000, maxHp: 1000, ac: 30 });
    expect(data.isHostile).toBe(true);
  });

  it("stores null stats when no combat fields are provided", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue(session("gm-1", []));

    const res = await createNpc(makeReq({ name: "Elder", role: "Sage" }), { params });
    expect(res.status).toBe(200);
    expect(mocks.prisma.nPC.create.mock.calls[0][0].data.stats).toBeNull();
  });
});
