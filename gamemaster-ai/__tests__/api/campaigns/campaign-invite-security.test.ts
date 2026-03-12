import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { POST } from "@/app/api/campaigns/[id]/invite/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1/invite", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("gm-1");
});

describe("POST /api/campaigns/[id]/invite", () => {
  it("rejects invite code generation for solo campaigns", async () => {
    mocks.prisma.campaign.findUnique.mockResolvedValue({
      id: "camp-1",
      creatorId: "gm-1",
      isSoftDeleted: false,
      isMultiplayer: false,
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("generates invite code only for multiplayer campaigns", async () => {
    mocks.prisma.campaign.findUnique.mockResolvedValue({
      id: "camp-1",
      creatorId: "gm-1",
      isSoftDeleted: false,
      isMultiplayer: true,
    });
    mocks.prisma.campaign.update.mockResolvedValue({
      id: "camp-1",
      inviteCode: "AB12CD34",
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.campaign.update).toHaveBeenCalledTimes(1);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.inviteCode).toBe("AB12CD34");
  });
});
