import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    message: { updateMany: vi.fn() },
    scenario: { updateMany: vi.fn() },
    user: { delete: vi.fn() },
  },
  getUserId: vi.fn(),
  rateLimitResponse: vi.fn(),
  bcryptCompare: vi.fn(),
  checkAchievements: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: (message = "Unauthorized") => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message }, { status: 401 });
  },
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    AUTH_SENSITIVE: { windowMs: 15 * 60 * 1000, max: 5 },
  },
}));

vi.mock("@/lib/achievements", () => ({
  checkAchievements: mocks.checkAchievements,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
  },
}));

import { DELETE } from "@/app/api/profile/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/profile", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.prisma.$transaction.mockImplementation(async (fn: any) => fn(mocks.tx));
  mocks.tx.message.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.scenario.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.user.delete.mockResolvedValue({ id: "user-1" });
});

describe("DELETE /api/profile security", () => {
  it("requires current password for account deletion", async () => {
    const response = await DELETE(makeRequest({}));

    expect(response.status).toBe(400);
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects deletion when current password is invalid", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: "$2a$10$hashed" });
    mocks.bcryptCompare.mockResolvedValue(false);

    const response = await DELETE(makeRequest({ currentPassword: "wrong-pass" }));

    expect(response.status).toBe(403);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes account only after password verification", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: "$2a$10$hashed" });
    mocks.bcryptCompare.mockResolvedValue(true);

    const response = await DELETE(makeRequest({ currentPassword: "CorrectPass1" }));

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
  });
});
