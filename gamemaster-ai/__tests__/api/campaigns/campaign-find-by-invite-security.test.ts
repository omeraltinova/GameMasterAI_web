import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
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
    AUTH_SENSITIVE: { windowMs: 15 * 60 * 1000, max: 5 },
  },
}));

import { POST } from "@/app/api/campaigns/join/route";

function makeRequest(inviteCode: string) {
  return new NextRequest("http://localhost:3000/api/campaigns/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
});

describe("POST /api/campaigns/join", () => {
  it("searches invite code only among active multiplayer campaigns", async () => {
    mocks.prisma.campaign.findFirst.mockResolvedValue(null);

    const response = await POST(makeRequest("ABCD1234"));

    expect(response.status).toBe(404);
    expect(mocks.prisma.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inviteCode: "ABCD1234",
          isMultiplayer: true,
          isSoftDeleted: false,
        }),
      })
    );
  });
});
