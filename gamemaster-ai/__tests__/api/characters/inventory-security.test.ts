import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    character: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
    READ: { windowMs: 60_000, max: 100 },
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { POST as addInventoryItem } from "@/app/api/characters/[id]/inventory/route";
import { PUT as updateInventoryItem } from "@/app/api/characters/[id]/inventory/[itemId]/route";

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/characters/char-1/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/characters/char-1/inventory/item-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.prisma.character.findUnique.mockResolvedValue({ userId: "user-1" });
  mocks.prisma.inventoryItem.findUnique.mockResolvedValue({
    id: "item-1",
    characterId: "char-1",
    name: "Sword",
    type: "weapon",
    description: null,
    quantity: 1,
    properties: null,
    weight: 2,
    equipped: false,
  });
});

describe("Inventory route numeric validation", () => {
  it("rejects out-of-range quantity when creating inventory item", async () => {
    const response = await addInventoryItem(
      makePostRequest({
        name: "Potion",
        type: "consumable",
        quantity: 2000,
      }),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.character.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.inventoryItem.create).not.toHaveBeenCalled();
  });

  it("rejects negative weight when creating inventory item", async () => {
    const response = await addInventoryItem(
      makePostRequest({
        name: "Shield",
        type: "armor",
        weight: -1,
      }),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.character.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.inventoryItem.create).not.toHaveBeenCalled();
  });

  it("rejects invalid quantity when updating inventory item", async () => {
    const response = await updateInventoryItem(
      makePutRequest({ quantity: 0 }),
      { params: Promise.resolve({ id: "char-1", itemId: "item-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.character.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("parses and persists valid numeric string values on update", async () => {
    mocks.prisma.inventoryItem.update.mockResolvedValue({
      id: "item-1",
      characterId: "char-1",
      name: "Sword",
      type: "weapon",
      description: null,
      quantity: 3,
      properties: null,
      weight: 2.5,
      equipped: false,
    });

    const response = await updateInventoryItem(
      makePutRequest({ quantity: "3", weight: "2.5" }),
      { params: Promise.resolve({ id: "char-1", itemId: "item-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 3,
          weight: 2.5,
        }),
      }),
    );
  });
});
