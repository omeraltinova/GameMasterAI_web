import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  prisma: {
    character: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    gameSession: {
      findUnique: vi.fn(),
    },
    diceRoll: {
      create: vi.fn(),
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
import {
  GET as getCharacters,
  POST as createCharacter,
} from "@/app/api/characters/route";
import { POST as rollDice } from "@/app/api/dice/roll/route";

// ── Helpers ─────────────────────────────────────────────────────────────────
function makePOSTRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET /api/characters
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/characters", () => {
  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await getCharacters();
    expect(res.status).toBe(401);
  });

  it("returns characters for authenticated user", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.character.findMany.mockResolvedValue([
      {
        id: "char-1",
        userId: "user-1",
        name: "Alderan",
        race: "Human",
        class: "Wizard",
        level: 5,
        experience: 2500,
        hp: 28,
        maxHp: 40,
        stats: '{"strength":10,"dexterity":14,"constitution":12,"intelligence":18,"wisdom":16,"charisma":13}',
        background: "Sage",
        appearance: null,
        backstory: null,
        imageUrl: null,
        campaignId: null,
        campaign: null,
        inventoryItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await getCharacters();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.characters).toHaveLength(1);
    expect(data.characters[0].name).toBe("Alderan");
    expect(data.characters[0].stats.strength).toBe(10);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /api/characters
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/characters", () => {
  const validCharacter = {
    name: "Silvarin",
    race: "Elf",
    class: "Ranger",
    level: 3,
    hp: 22,
    maxHp: 22,
    stats: {
      strength: 12,
      dexterity: 18,
      constitution: 13,
      intelligence: 10,
      wisdom: 14,
      charisma: 10,
    },
  };

  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await createCharacter(
      makePOSTRequest("http://localhost:3000/api/characters", validCharacter)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid character data (missing name)", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await createCharacter(
      makePOSTRequest("http://localhost:3000/api/characters", {
        race: "Elf",
        class: "Ranger",
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates character successfully", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.character.create.mockResolvedValue({
      id: "char-new",
      userId: "user-1",
      name: "Silvarin",
      race: "Elf",
      class: "Ranger",
      level: 3,
      experience: 0,
      hp: 22,
      maxHp: 22,
      stats: JSON.stringify(validCharacter.stats),
      background: null,
      appearance: null,
      backstory: null,
      imageUrl: null,
      campaignId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await createCharacter(
      makePOSTRequest("http://localhost:3000/api/characters", validCharacter)
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.character.name).toBe("Silvarin");
    expect(data.character.race).toBe("Elf");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. POST /api/dice/roll
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/dice/roll", () => {
  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
        diceType: "d20",
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when diceType is missing", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when sessionId is missing", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        diceType: "d20",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when session not found", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue(null);

    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "nonexistent",
        diceType: "d20",
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user has no access to session", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "camp-1",
      campaign: {
        creatorId: "other-user",
        players: [],
      },
    });

    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
        diceType: "d20",
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid dice type", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "camp-1",
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });

    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
        diceType: "d999",
      })
    );
    expect(res.status).toBe(400);
  });

  it("successfully rolls dice and returns results", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "camp-1",
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });
    mocks.prisma.diceRoll.create.mockResolvedValue({
      id: "roll-1",
      sessionId: "s1",
      characterId: null,
      diceType: "d20",
      count: 1,
      results: "[15]",
      modifier: 0,
      total: 15,
      purpose: null,
      timestamp: new Date(),
    });
    mocks.prisma.message.create.mockResolvedValue({
      id: "msg-1",
      sessionId: "s1",
      senderType: "DICE",
      senderName: "Zar Atışı",
      content: "🎲 d20: [15] = **15**",
      timestamp: new Date(),
    });

    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
        diceType: "d20",
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.results).toBeInstanceOf(Array);
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.total).toBeLessThanOrEqual(20);
  });

  it("rolls multiple dice correctly", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.gameSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "camp-1",
      campaign: {
        creatorId: "user-1",
        players: [],
      },
    });
    mocks.prisma.diceRoll.create.mockResolvedValue({
      id: "roll-2",
      sessionId: "s1",
      timestamp: new Date(),
    });
    mocks.prisma.message.create.mockResolvedValue({
      id: "msg-2",
      sessionId: "s1",
      senderType: "DICE",
      senderName: "Zar Atışı",
      content: "test",
      timestamp: new Date(),
    });

    const res = await rollDice(
      makePOSTRequest("http://localhost:3000/api/dice/roll", {
        sessionId: "s1",
        diceType: "d6",
        count: 3,
        modifier: 2,
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.results).toHaveLength(3);
    // Each d6 result should be 1-6, total = sum + modifier
    for (const r of data.results) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
});
