import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    diceRoll: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  },
  forbiddenResponse: (message = "Forbidden") => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  },
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
  },
}));

import { GET as getUpdates } from "@/app/api/sessions/[id]/updates/route";
import { GET as getState } from "@/app/api/sessions/[id]/state/route";
import { GET as getDiceHistory } from "@/app/api/sessions/[id]/dice-history/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
});

describe("Session polling security", () => {
  it("applies rate limit and excludes soft-deleted messages in updates endpoint", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "session-1",
      updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });
    mocks.prisma.message.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/session-1/updates?since=2026-01-01T09:59:00.000Z",
      { method: "GET" },
    );
    const response = await getUpdates(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(
      "user-1",
      "GET:/api/sessions/[id]/updates",
      { windowMs: 60_000, max: 100 },
    );
    expect(mocks.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: "session-1",
          isSoftDeleted: false,
        }),
        take: 20,
      }),
    );
  });

  it("applies rate limit in state endpoint", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "session-1",
      campaignId: "campaign-1",
      currentState: "{}",
      turnOrder: null,
      activePlayer: null,
      updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });

    const request = new NextRequest("http://localhost:3000/api/sessions/session-1/state", {
      method: "GET",
    });
    const response = await getState(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(
      "user-1",
      "GET:/api/sessions/[id]/state",
      { windowMs: 60_000, max: 100 },
    );
  });

  it("caps dice history read and stats sample sizes", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });
    mocks.prisma.diceRoll.findMany
      .mockResolvedValueOnce([
        {
          id: "roll-1",
          diceType: "d20",
          count: 1,
          results: "[20]",
          modifier: 0,
          total: 20,
          purpose: "check",
          character: { id: "char-1", name: "Hero" },
          timestamp: new Date("2026-01-01T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { results: "[20]" },
        { results: "[1]" },
      ]);
    mocks.prisma.diceRoll.count
      .mockResolvedValueOnce(123)
      .mockResolvedValueOnce(45);

    const request = new NextRequest(
      "http://localhost:3000/api/sessions/session-1/dice-history?limit=999",
      { method: "GET" },
    );
    const response = await getDiceHistory(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(
      "user-1",
      "GET:/api/sessions/[id]/dice-history",
      { windowMs: 60_000, max: 100 },
    );
    expect(mocks.prisma.diceRoll.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 50,
      }),
    );
    expect(mocks.prisma.diceRoll.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 500,
      }),
    );
  });
});
