import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gameSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
}));

vi.mock("@/lib/ai/gamemaster", () => ({
  generateOpeningNarration: vi.fn(),
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockReturnValue(null),
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { GET, POST } from "@/app/api/campaigns/[id]/active-session/route";

function makeRequest(method: "GET" | "POST") {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1/active-session", {
    method,
    body: method === "POST" ? JSON.stringify({}) : undefined,
  });
}

function buildCampaign(overrides: Partial<any> = {}) {
  return {
    id: "camp-1",
    name: "Test Campaign",
    description: "desc",
    creatorId: "gm-1",
    scenarioId: null,
    isMultiplayer: true,
    maxPlayers: 4,
    inviteCode: "INVITE",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    creator: {
      id: "gm-1",
      username: "gm",
      avatar: null,
      role: "MEMBER",
    },
    scenario: null,
    players: [
      {
        id: "cp-1",
        campaignId: "camp-1",
        userId: "player-1",
        characterId: "char-1",
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        isActive: true,
        character: {
          id: "char-1",
          name: "Aragorn",
          race: "Human",
          class: "Ranger",
          level: 5,
          experience: 0,
          hp: 30,
          maxHp: 30,
          stats: "{}",
          background: null,
          appearance: null,
          backstory: null,
          imageUrl: null,
          userId: "player-1",
          campaignId: "camp-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        user: {
          id: "player-1",
          username: "player",
          avatar: null,
          role: "MEMBER",
        },
      },
    ],
    sessions: [
      {
        id: "session-1",
        campaignId: "camp-1",
        currentState: "{}",
        aiContext: "",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        messages: [],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("player-1");
  mocks.prisma.campaign.findUnique.mockResolvedValue(buildCampaign());
  mocks.prisma.gameSession.create.mockResolvedValue({
    id: "session-created",
    campaignId: "camp-1",
    currentState: "{}",
    aiContext: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    messages: [],
  });
  mocks.prisma.gameSession.findUnique.mockResolvedValue({
    id: "session-created",
    campaignId: "camp-1",
    currentState: "{}",
    aiContext: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    messages: [],
  });
  mocks.prisma.message.create.mockResolvedValue({ id: "msg-1" });
});

describe("/api/campaigns/[id]/active-session security", () => {
  it("queries campaign with explicit safe user field selection", async () => {
    const response = await GET(makeRequest("GET"), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);

    const queryArg = mocks.prisma.campaign.findUnique.mock.calls[0]?.[0];
    expect(queryArg?.select?.creator?.select).toEqual({
      id: true,
      username: true,
      avatar: true,
      role: true,
    });
    expect(queryArg?.select?.players?.select?.user?.select).toEqual({
      id: true,
      username: true,
      avatar: true,
      role: true,
    });
    expect(queryArg?.select?.creator?.select?.password).toBeUndefined();
    expect(queryArg?.select?.players?.select?.user?.select?.password).toBeUndefined();
  });

  it("GET is read-only and does not create session when none exists", async () => {
    mocks.prisma.campaign.findUnique.mockResolvedValue(buildCampaign({ sessions: [] }));

    const response = await GET(makeRequest("GET"), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.prisma.gameSession.create).not.toHaveBeenCalled();
    expect(mocks.prisma.message.create).not.toHaveBeenCalled();
    expect(mocks.prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("POST can create and activate session for GM when none exists", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.campaign.findUnique.mockResolvedValue(
      buildCampaign({ status: "DRAFT", sessions: [] }),
    );

    const response = await POST(makeRequest("POST"), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.gameSession.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.message.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "camp-1" },
      data: { status: "ACTIVE" },
    });
  });
});
