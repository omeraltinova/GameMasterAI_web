import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
    diceRoll: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
  checkAchievements: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: (message = "Unauthorized") => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message }, { status: 401 });
  },
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
  },
}));

vi.mock("@/lib/achievements", () => ({
  checkAchievements: mocks.checkAchievements,
  ACHIEVEMENT_DEFINITIONS: [
    {
      id: "newcomer",
      label: "Yeni Maceraperest",
      description: "Hesap oluşturdu",
      category: "general",
      color: "text-lime-400",
      iconName: "Footprints",
    },
    {
      id: "veteran",
      label: "Veteran",
      description: "6+ aydır üye",
      category: "general",
      color: "text-amber-400",
      iconName: "CalendarDays",
    },
  ],
}));

import { GET } from "@/app/api/profile/route";

function buildBaseUser() {
  const createdAt = new Date("2025-01-01T00:00:00.000Z");

  return {
    id: "user-1",
    username: "player-one",
    email: "player@example.com",
    avatar: null,
    bio: null,
    role: "MEMBER",
    createdAt,
    profilePublic: true,
    showCharacters: true,
    showCampaigns: true,
    showScenarios: true,
    showStats: true,
    characters: [],
    campaigns: [],
    campaignPlayers: [],
    _count: {
      characters: 0,
      campaigns: 0,
      campaignPlayers: 0,
      messages: 0,
      scenarios: 0,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);

  mocks.prisma.user.findUnique.mockResolvedValue(buildBaseUser());
  mocks.prisma.message.count.mockResolvedValue(0);
  mocks.prisma.diceRoll.findMany.mockResolvedValue([]);
  mocks.prisma.userAchievement.findMany.mockResolvedValue([]);
  mocks.prisma.userAchievement.createMany.mockResolvedValue({ count: 1 });

  mocks.checkAchievements.mockReturnValue([
    { id: "newcomer", unlocked: true },
    { id: "veteran", unlocked: false },
  ]);
});

describe("GET /api/profile achievements activity", () => {
  it("stores newly unlocked achievements and includes them in recent activity", async () => {
    const persistedAt = new Date("2026-03-01T10:00:00.000Z");
    mocks.prisma.userAchievement.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          achievementId: "newcomer",
          unlockedAt: persistedAt,
        },
      ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.prisma.userAchievement.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          achievementId: "newcomer",
          unlockedAt: expect.any(Date),
        },
      ],
      skipDuplicates: true,
    });

    const body = await response.json();
    expect(body.achievements).toEqual([
      {
        id: "newcomer",
        unlocked: true,
        unlockedAt: "2026-03-01T10:00:00.000Z",
      },
      {
        id: "veteran",
        unlocked: false,
        unlockedAt: null,
      },
    ]);
    expect(body.recentActivity).toEqual([
      {
        type: "achievement_unlocked",
        label: "Başarım kazanıldı",
        entityName: "Yeni Maceraperest",
        date: "2026-03-01T10:00:00.000Z",
      },
    ]);
  });

  it("does not write again when achievement is already persisted", async () => {
    const persistedAt = new Date("2026-02-15T08:30:00.000Z");
    mocks.prisma.userAchievement.findMany.mockResolvedValue([
      {
        achievementId: "newcomer",
        unlockedAt: persistedAt,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.prisma.userAchievement.createMany).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.achievements).toEqual([
      {
        id: "newcomer",
        unlocked: true,
        unlockedAt: "2026-02-15T08:30:00.000Z",
      },
      {
        id: "veteran",
        unlocked: false,
        unlockedAt: null,
      },
    ]);
    expect(body.recentActivity[0]).toEqual({
      type: "achievement_unlocked",
      label: "Başarım kazanıldı",
      entityName: "Yeni Maceraperest",
      date: "2026-02-15T08:30:00.000Z",
    });
  });
});
