import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    campaignPlayer: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    character: {
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

import { DELETE } from "@/app/api/campaigns/[id]/players/[playerId]/route";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-a/players/player-1", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/campaigns/[id]/players/[playerId]", () => {
  it("returns 404 and does not delete when player record belongs to another campaign", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.campaign.findUnique.mockResolvedValue({ id: "camp-a", creatorId: "gm-1" });
    mocks.prisma.campaignPlayer.findUnique.mockResolvedValue({
      id: "player-1",
      campaignId: "camp-b",
      userId: "user-2",
      characterId: "char-1",
      character: { id: "char-1" },
    });

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "camp-a", playerId: "player-1" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.prisma.character.update).not.toHaveBeenCalled();
    expect(mocks.prisma.campaignPlayer.delete).not.toHaveBeenCalled();
  });

  it("deletes player only when membership belongs to requested campaign", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.campaign.findUnique.mockResolvedValue({ id: "camp-a", creatorId: "gm-1" });
    mocks.prisma.campaignPlayer.findUnique.mockResolvedValue({
      id: "player-1",
      campaignId: "camp-a",
      userId: "user-2",
      characterId: "char-1",
      character: { id: "char-1" },
    });
    mocks.prisma.character.update.mockResolvedValue({ id: "char-1" });
    mocks.prisma.campaignPlayer.delete.mockResolvedValue({ id: "player-1" });

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "camp-a", playerId: "player-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.character.update).toHaveBeenCalledWith({
      where: { id: "char-1" },
      data: { campaignId: null },
    });
    expect(mocks.prisma.campaignPlayer.delete).toHaveBeenCalledWith({
      where: { id: "player-1" },
    });
  });
});
