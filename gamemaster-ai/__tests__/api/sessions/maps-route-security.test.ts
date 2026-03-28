import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
    map: {
      create: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
  normalizeImageUrl: vi.fn(),
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

vi.mock("@/lib/security/imageUrl", () => ({
  normalizeImageUrl: mocks.normalizeImageUrl,
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { GET, POST } from "@/app/api/sessions/[id]/maps/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.normalizeImageUrl.mockImplementation((url: string) => url);
});

describe("/api/sessions/[id]/maps prompt redaction", () => {
  it("does not expose stored prompt in maps list response", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "session-1",
      campaign: {
        creatorId: "user-1",
        players: [],
      },
      maps: [
        {
          id: "map-1",
          sessionId: "session-1",
          name: "Dungeon",
          description: "desc",
          imageUrl: "https://example.com/map.png",
          isAIGenerated: true,
          prompt: "internal prompt",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/sessions/session-1/maps", { method: "GET" }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.maps[0].prompt).toBeUndefined();
  });

  it("does not expose prompt field in manual map create response", async () => {
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "session-1",
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });
    mocks.prisma.map.create.mockResolvedValue({
      id: "map-1",
      sessionId: "session-1",
      name: "Manual Map",
      description: null,
      imageUrl: "https://example.com/map.png",
      isAIGenerated: false,
      prompt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/sessions/session-1/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Manual Map",
          imageUrl: "https://example.com/map.png",
        }),
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.map.prompt).toBeUndefined();
  });
});
