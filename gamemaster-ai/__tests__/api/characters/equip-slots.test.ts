import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    character: { findUnique: vi.fn() },
    inventoryItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/server", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockResolvedValue(null),
  RATE_LIMIT_TIERS: { GAME_ACTION: { windowMs: 60000, max: 60 } },
}));

import { NextRequest } from "next/server";
import { PUT as equip } from "@/app/api/characters/[id]/inventory/[itemId]/equip/route";

const params = Promise.resolve({ id: "char-1", itemId: "item-new" });

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/characters/char-1/inventory/item-new/equip", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.prisma.character.findUnique.mockResolvedValue({ userId: "user-1" });
  // Route runs the equip body inside prisma.$transaction(cb): execute cb with a tx
  // that proxies to the same inventoryItem mocks.
  mocks.prisma.$transaction.mockImplementation(async (cb: any) =>
    cb({ inventoryItem: mocks.prisma.inventoryItem })
  );
  mocks.prisma.inventoryItem.update.mockResolvedValue({
    id: "item-new",
    type: "Armor",
    equipped: true,
    properties: null,
  });
  mocks.prisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
});

describe("PUT equip — slot occupancy", () => {
  it("rejects a non-equippable type", async () => {
    mocks.prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-new",
      characterId: "char-1",
      type: "Potion",
      equipped: false,
    });

    const res = await equip(makeReq({ equipped: true }), { params });
    expect(res.status).toBe(400);
  });

  it("unequips the existing body armor when equipping a new one (limit 1)", async () => {
    mocks.prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-new",
      characterId: "char-1",
      type: "Armor",
      equipped: false,
    });
    // One other body armor already equipped
    mocks.prisma.inventoryItem.findMany.mockResolvedValue([{ id: "armor-old" }]);

    const res = await equip(makeReq({ equipped: true }), { params });
    expect(res.status).toBe(200);

    expect(mocks.prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["armor-old"] } },
      data: { equipped: false },
    });
    expect(mocks.prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-new" },
      data: { equipped: true },
    });
  });

  it("keeps one ring and unequips the oldest when a third ring is equipped (limit 2)", async () => {
    mocks.prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-new",
      characterId: "char-1",
      type: "Ring",
      equipped: false,
    });
    // Two rings already equipped → equipping a third must drop the oldest one only.
    mocks.prisma.inventoryItem.findMany.mockResolvedValue([{ id: "ring-a" }, { id: "ring-b" }]);

    const res = await equip(makeReq({ equipped: true }), { params });
    expect(res.status).toBe(200);

    expect(mocks.prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ring-a"] } },
      data: { equipped: false },
    });
  });

  it("does not run slot logic when unequipping", async () => {
    mocks.prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "item-new",
      characterId: "char-1",
      type: "Armor",
      equipped: true,
    });
    mocks.prisma.inventoryItem.update.mockResolvedValue({
      id: "item-new",
      type: "Armor",
      equipped: false,
      properties: null,
    });

    const res = await equip(makeReq({ equipped: false }), { params });
    expect(res.status).toBe(200);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.inventoryItem.updateMany).not.toHaveBeenCalled();
  });
});
