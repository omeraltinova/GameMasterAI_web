import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    gameSession: {
      findMany: vi.fn(),
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

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockReturnValue(null),
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
  },
}));

import { GET } from "@/app/api/campaigns/[id]/sessions/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1/sessions", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("player-1");
});

describe("GET /api/campaigns/[id]/sessions privacy", () => {
  it("redacts creator email from session campaign payload", async () => {
    mocks.prisma.campaign.findUnique.mockResolvedValue({
      id: "camp-1",
      creatorId: "gm-1",
      isSoftDeleted: false,
      players: [{ userId: "player-1" }],
    });
    mocks.prisma.gameSession.findMany.mockResolvedValue([
      {
        id: "session-1",
        campaignId: "camp-1",
        currentState: "{}",
        aiContext: "",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        campaign: {
          id: "camp-1",
          name: "Test",
          inviteCode: "SECRET42",
          creator: {
            id: "gm-1",
            username: "gm",
            email: "gm@example.com",
            avatar: null,
          },
          scenario: null,
        },
      },
    ]);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data[0].campaign.creator.email).toBeUndefined();
    expect(data[0].campaign.inviteCode).toBeNull();
  });
});
