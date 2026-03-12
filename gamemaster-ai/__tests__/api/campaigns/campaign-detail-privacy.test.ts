import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
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

import { GET } from "@/app/api/campaigns/[id]/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("player-1");
});

describe("GET /api/campaigns/[id] privacy", () => {
  it("does not expose creator email to campaign participants", async () => {
    mocks.prisma.campaign.findUnique.mockResolvedValue({
      id: "camp-1",
      creatorId: "gm-1",
      isSoftDeleted: false,
      inviteCode: "SECRET42",
      creator: {
        id: "gm-1",
        username: "gm",
        email: "gm@example.com",
        avatar: null,
      },
      scenario: null,
      characters: [],
      players: [
        {
          id: "cp-1",
          userId: "player-1",
          isActive: true,
          user: { id: "player-1", username: "player", avatar: null },
          character: null,
        },
      ],
      sessions: [],
    });

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.campaign.creator.email).toBeUndefined();
    expect(data.campaign.inviteCode).toBeNull();
  });
});
