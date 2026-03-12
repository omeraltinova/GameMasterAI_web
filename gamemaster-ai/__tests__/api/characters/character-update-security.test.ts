import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    character: {
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

import { PUT } from "@/app/api/characters/[id]/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/characters/char-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/characters/[id] security", () => {
  it("blocks progression fields from generic update endpoint", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.character.findUnique.mockResolvedValue({ userId: "user-1" });

    const response = await PUT(
      makeRequest({ name: "New Name", hp: 999 }),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.character.update).not.toHaveBeenCalled();
  });

  it("allows safe profile fields", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.character.findUnique.mockResolvedValue({ userId: "user-1" });
    mocks.prisma.character.update.mockResolvedValue({
      id: "char-1",
      name: "Updated Hero",
      race: "Human",
      class: "Fighter",
      level: 3,
      experience: 0,
      hp: 22,
      maxHp: 22,
      stats: JSON.stringify({ strength: 12 }),
      background: null,
      appearance: null,
      backstory: null,
      imageUrl: null,
      campaignId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await PUT(
      makeRequest({ name: "Updated Hero", background: "Veteran" }),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.character.update).toHaveBeenCalledWith({
      where: { id: "char-1" },
      data: {
        name: "Updated Hero",
        background: "Veteran",
      },
    });
  });
});
