import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    message: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    diceRoll: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  getUserId: vi.fn(),
  checkAchievements: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
}));

vi.mock("@/lib/achievements", () => ({
  checkAchievements: mocks.checkAchievements,
}));

import { GET } from "@/app/api/users/[id]/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/users/target-user", { method: "GET" });
}

function buildBaseUser() {
  const createdAt = new Date("2025-01-01T00:00:00.000Z");

  return {
    id: "target-user",
    username: "target",
    avatar: null,
    role: "MEMBER",
    isSoftDeleted: false,
    createdAt,
    profilePublic: true,
    showCharacters: true,
    showCampaigns: true,
    showScenarios: true,
    showStats: true,
    characters: [],
    campaigns: [],
    campaignPlayers: [],
    scenarios: [],
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

  mocks.prisma.user.findUnique.mockResolvedValue(buildBaseUser());
  mocks.prisma.message.count.mockResolvedValue(0);
  mocks.prisma.message.findFirst.mockResolvedValue(null);
  mocks.prisma.diceRoll.findMany.mockResolvedValue([]);
  mocks.prisma.userAchievement.findMany.mockResolvedValue([]);
  mocks.prisma.userAchievement.create.mockReturnValue({} as any);

  mocks.checkAchievements.mockReturnValue([
    { id: "newcomer", unlocked: true },
  ]);
});

describe("GET /api/users/[id] security", () => {
  it("does not write achievements while viewing another user's profile", async () => {
    mocks.getUserId.mockResolvedValue("viewer-user");

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "target-user" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.userAchievement.create).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.achievements)).toBe(true);
    expect(body.achievements[0]).toEqual({ id: "newcomer", unlockedAt: null });
  });

  it("does not write achievements in GET even for profile owner", async () => {
    mocks.getUserId.mockResolvedValue("target-user");

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "target-user" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.userAchievement.create).not.toHaveBeenCalled();
  });
});
