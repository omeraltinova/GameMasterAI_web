import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  message: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: () => NextResponse.json({ success: false }, { status: 401 }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    message: mocks.message,
  },
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockResolvedValue(null),
  RATE_LIMIT_TIERS: {
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { PATCH } from "@/app/api/messages/[id]/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/messages/msg-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildMessage(senderType: string, senderId: string | null) {
  return {
    id: "msg-1",
    senderId,
    senderType,
    session: {
      campaign: {
        creatorId: "gm-1",
        players: [],
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.message.update.mockResolvedValue({ id: "msg-1", locationName: "Cave" });
});

describe("PATCH /api/messages/[id] metadata permissions", () => {
  it("prevents campaign creator from editing PLAYER message metadata", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.message.findUnique.mockResolvedValue(buildMessage("PLAYER", "player-1"));

    const response = await PATCH(
      makeRequest({ locationName: "Cave" }),
      { params: Promise.resolve({ id: "msg-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.message.update).not.toHaveBeenCalled();
  });

  it("allows campaign creator to edit GM message metadata", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.message.findUnique.mockResolvedValue(buildMessage("GM", null));

    const response = await PATCH(
      makeRequest({ locationName: "Cave" }),
      { params: Promise.resolve({ id: "msg-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.message.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: {
        locationImageUrl: undefined,
        locationName: "Cave",
      },
    });
  });

  it("allows message sender to edit own PLAYER message metadata", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    mocks.message.findUnique.mockResolvedValue(buildMessage("PLAYER", "player-1"));

    const response = await PATCH(
      makeRequest({ locationName: "Camp" }),
      { params: Promise.resolve({ id: "msg-1" }) },
    );

    expect(response.status).toBe(200);
  });
});
