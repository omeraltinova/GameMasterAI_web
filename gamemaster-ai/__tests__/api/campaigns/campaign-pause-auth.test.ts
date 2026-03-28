import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignPlayer: {
      findFirst: vi.fn(),
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
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { POST } from "@/app/api/campaigns/[id]/pause/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1/pause", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimitResponse.mockReturnValue(null);
});

describe("POST /api/campaigns/[id]/pause security", () => {
  it("returns 401 early for unauthenticated users without campaign lookup", async () => {
    mocks.getUserId.mockResolvedValue(null);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.prisma.campaign.findUnique).not.toHaveBeenCalled();
    expect(mocks.rateLimitResponse).not.toHaveBeenCalled();
  });

  it("applies rate limit and campaign lookup for authenticated users", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.campaign.findUnique.mockResolvedValue({
      id: "camp-1",
      creatorId: "gm-1",
      status: "ACTIVE",
    });
    mocks.prisma.campaign.update.mockResolvedValue({ id: "camp-1" });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(
      "gm-1",
      "POST:/api/campaigns/[id]/pause",
      { windowMs: 60_000, max: 30 },
    );
    expect(mocks.prisma.campaign.findUnique).toHaveBeenCalledTimes(1);
  });
});
