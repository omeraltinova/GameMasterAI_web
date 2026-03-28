import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
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

import { POST } from "@/app/api/campaigns/[id]/join/route";

function makeRequest(payload: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/campaigns/camp-1/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function makeTx(overrides: Partial<any> = {}) {
  return {
    campaign: {
      findUnique: vi.fn().mockResolvedValue({
        id: "camp-1",
        creatorId: "gm-1",
        inviteCode: "ABC123",
        status: "ACTIVE",
        maxPlayers: 1,
        isMultiplayer: true,
        isSoftDeleted: false,
      }),
    },
    campaignPlayer: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "cp-1" }),
      update: vi.fn().mockResolvedValue({ id: "cp-1" }),
    },
    character: {
      findFirst: vi.fn().mockResolvedValue({
        id: "char-1",
        campaignId: null,
      }),
      update: vi.fn().mockResolvedValue({ id: "char-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("player-1");
});

describe("POST /api/campaigns/[id]/join security", () => {
  it("rejects non-creator join attempts for solo campaigns", async () => {
    const tx = makeTx({
      campaign: {
        findUnique: vi.fn().mockResolvedValue({
          id: "camp-1",
          creatorId: "gm-1",
          inviteCode: null,
          status: "ACTIVE",
          maxPlayers: 1,
          isMultiplayer: false,
          isSoftDeleted: false,
        }),
      },
    });
    mocks.prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const response = await POST(makeRequest({ characterId: "char-1" }), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(403);
    expect(tx.campaignPlayer.create).not.toHaveBeenCalled();
  });

  it("rejects when campaign capacity is full inside transaction", async () => {
    const tx = makeTx({
      campaignPlayer: {
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(),
        update: vi.fn(),
      },
    });
    mocks.prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const response = await POST(makeRequest({ characterId: "char-1", inviteCode: "ABC123" }), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(400);
    expect(tx.campaignPlayer.create).not.toHaveBeenCalled();
  });

  it("retries serialization conflicts and succeeds on a later attempt", async () => {
    const tx = makeTx();
    const serializationError = new Error("serialization conflict") as Error & { code?: string };
    serializationError.code = "P2034";

    mocks.prisma.$transaction
      .mockRejectedValueOnce(serializationError)
      .mockImplementationOnce(async (fn: any) => fn(tx));

    const response = await POST(makeRequest({ characterId: "char-1", inviteCode: "ABC123" }), {
      params: Promise.resolve({ id: "camp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.campaignPlayer.create).toHaveBeenCalledTimes(1);
    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "char-1" },
      data: { campaignId: "camp-1" },
    });
  });
});
