import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
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
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { GET } from "@/app/api/sessions/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
});

describe("GET /api/sessions/[id] security", () => {
  it("queries only non-soft-deleted messages", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/sessions/session-1", {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(404);
    const queryArg = mocks.prisma.gameSession.findUnique.mock.calls[0]?.[0];
    expect(queryArg?.include?.messages?.where).toEqual({ isSoftDeleted: false });
  });

  it("does not expose creator/player email in session payload", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "session-1",
      campaignId: "campaign-1",
      currentState: "{}",
      aiContext: "",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      campaign: {
        id: "campaign-1",
        name: "Campaign",
        description: "Desc",
        status: "ACTIVE",
        isMultiplayer: true,
        creatorId: "gm-1",
        scenario: null,
        creator: {
          id: "gm-1",
          username: "gm",
        },
        players: [
          {
            id: "cp-1",
            userId: "user-1",
            user: {
              id: "user-1",
              username: "player",
            },
            character: null,
          },
        ],
      },
      messages: [],
      npcs: [],
      combats: [],
      maps: [],
    });

    const request = new NextRequest("http://localhost:3000/api/sessions/session-1", {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect("email" in data.session.campaign.creator).toBe(false);
    expect("email" in data.session.campaign.players[0].user).toBe(false);
  });
});
