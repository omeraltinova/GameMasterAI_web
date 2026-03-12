import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
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
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
  },
}));

import { GET } from "@/app/api/users/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/users?search=test&page=1&limit=20", {
    method: "GET",
  });
}

const baseUserRow = {
  id: "u-2",
  username: "target",
  avatar: null,
  role: "ADMIN",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  _count: {
    characters: 2,
    campaigns: 1,
    campaignPlayers: 3,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("viewer-1");
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.prisma.user.count.mockResolvedValue(1);
  mocks.prisma.user.findMany.mockResolvedValue([baseUserRow]);
});

describe("GET /api/users security", () => {
  it("redacts role for non-admin viewers", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      role: "MEMBER",
      isSoftDeleted: false,
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.users[0].role).toBeUndefined();
  });

  it("includes role for admin viewers", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      role: "ADMIN",
      isSoftDeleted: false,
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.users[0].role).toBe("ADMIN");
  });
});
