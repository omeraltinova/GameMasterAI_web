import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  unauthorizedResponse: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  getUserSession: vi.fn(),
  requireAuth: vi.fn(),
  unauthorizedResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { message: "Oturum açmanız gerekiyor" },
      { status: 401 }
    );
  },
}));

// Mock rate limiter to always allow
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockReturnValue(null),
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  applyRateLimit: vi.fn().mockReturnValue({ limited: false }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  RATE_LIMIT_TIERS: {
    AUTH_SENSITIVE: { windowMs: 60000, max: 5 },
    READ: { windowMs: 60000, max: 100 },
    WRITE: { windowMs: 60000, max: 30 },
    GAME_ACTION: { windowMs: 60000, max: 60 },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/campaigns/route";

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeGETRequest(url = "http://localhost:3000/api/campaigns") {
  return new NextRequest(url, { method: "GET" });
}

function makePOSTRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET /api/campaigns
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/campaigns", () => {
  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await GET(makeGETRequest());
    expect(res.status).toBe(401);
  });

  it("returns campaigns list for authenticated user", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.campaign.findMany.mockResolvedValue([
      {
        id: "camp-1",
        name: "Test Campaign",
        description: "A test",
        creatorId: "user-1",
        isMultiplayer: false,
        maxPlayers: 4,
        inviteCode: "ABC123",
        status: "DRAFT",
        creator: { id: "user-1", username: "testuser", email: "test@test.com" },
        scenario: null,
        characters: [],
        players: [],
        sessions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await GET(makeGETRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.campaigns).toHaveLength(1);
    expect(data.campaigns[0].name).toBe("Test Campaign");
  });

  it("returns empty array when user has no campaigns", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.campaign.findMany.mockResolvedValue([]);

    const res = await GET(makeGETRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.campaigns).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /api/campaigns
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/campaigns", () => {
  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await POST(makePOSTRequest({ name: "New Campaign" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await POST(makePOSTRequest({}));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.message).toBeTruthy();
  });

  it("creates campaign successfully", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.campaign.create.mockResolvedValue({
      id: "camp-new",
      name: "My Adventure",
      description: "Epic quest",
      creatorId: "user-1",
      scenarioId: null,
      isMultiplayer: false,
      maxPlayers: 4,
      inviteCode: "ABCD1234",
      status: "DRAFT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      makePOSTRequest({ name: "My Adventure", description: "Epic quest" })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.campaign.name).toBe("My Adventure");
    expect(data.campaign.inviteCode).toBeTruthy();
  });

  it("creates multiplayer campaign with maxPlayers", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.campaign.create.mockResolvedValue({
      id: "camp-mp",
      name: "Party Quest",
      description: null,
      creatorId: "user-1",
      scenarioId: null,
      isMultiplayer: true,
      maxPlayers: 6,
      inviteCode: "EFGH5678",
      status: "DRAFT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      makePOSTRequest({
        name: "Party Quest",
        isMultiplayer: true,
        maxPlayers: 6,
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.campaign.isMultiplayer).toBe(true);
    expect(data.campaign.maxPlayers).toBe(6);
  });
});
