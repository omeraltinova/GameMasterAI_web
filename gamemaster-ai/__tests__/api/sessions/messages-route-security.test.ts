import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
  getCampaignActorRole: vi.fn(),
  hasCampaignAccess: vi.fn(),
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

vi.mock("@/lib/auth/permissions", () => ({
  canManageCampaign: vi.fn().mockReturnValue(true),
  getCampaignActorRole: mocks.getCampaignActorRole,
  hasCampaignAccess: mocks.hasCampaignAccess,
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
    GAME_ACTION: { windowMs: 60_000, max: 60 },
  },
}));

import { GET } from "@/app/api/sessions/[id]/messages/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.getCampaignActorRole.mockReturnValue("PLAYER");
  mocks.hasCampaignAccess.mockReturnValue(true);
  mocks.prisma.gameSession.findUnique.mockResolvedValue({
    id: "session-1",
    campaign: {
      creatorId: "gm-1",
      players: [{ userId: "user-1" }],
    },
  });
  mocks.prisma.message.findMany.mockResolvedValue([]);
  mocks.prisma.message.count.mockResolvedValue(5);
});

describe("GET /api/sessions/[id]/messages pagination security", () => {
  it("clamps untrusted limit/offset query params", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/session-1/messages?limit=9999&offset=-20",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        skip: 0,
      }),
    );

    const body = await response.json();
    expect(body.pagination.limit).toBe(100);
    expect(body.pagination.offset).toBe(0);
  });

  it("falls back to safe defaults for invalid numeric params", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/sessions/session-1/messages?limit=abc&offset=NaN",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
      }),
    );
  });
});
