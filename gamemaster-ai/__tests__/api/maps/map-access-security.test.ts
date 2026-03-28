import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    map: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  unauthorizedResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  },
  forbiddenResponse: (message = "Forbidden") => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, message }, { status: 403 });
  },
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: vi.fn().mockReturnValue(null),
  RATE_LIMIT_TIERS: {
    WRITE: { windowMs: 60_000, max: 30 },
  },
}));

import { GET, PUT, DELETE } from "@/app/api/maps/[mapId]/route";

function makePutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/maps/map-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest("http://localhost:3000/api/maps/map-1", {
    method: "DELETE",
  });
}

function makeGetRequest() {
  return new NextRequest("http://localhost:3000/api/maps/map-1", {
    method: "GET",
  });
}

function buildMap() {
  return {
    id: "map-1",
    sessionId: "session-1",
    name: "Dungeon",
    description: "old",
    imageUrl: "https://example.com/map.png",
    isAIGenerated: false,
    prompt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    session: {
      campaign: {
        creatorId: "gm-1",
        players: [{ userId: "player-1" }],
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/maps/[mapId] access security", () => {
  it("blocks player from updating map", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    mocks.prisma.map.findUnique.mockResolvedValue(buildMap());

    const response = await PUT(makePutRequest({ name: "New Name" }), {
      params: Promise.resolve({ mapId: "map-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.prisma.map.update).not.toHaveBeenCalled();
  });

  it("blocks player from deleting map", async () => {
    mocks.getUserId.mockResolvedValue("player-1");
    mocks.prisma.map.findUnique.mockResolvedValue(buildMap());

    const response = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ mapId: "map-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.prisma.map.delete).not.toHaveBeenCalled();
  });

  it("allows creator to update and delete map", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.map.findUnique.mockResolvedValue(buildMap());
    mocks.prisma.map.update.mockResolvedValue({
      ...buildMap(),
      name: "Updated",
      description: "new",
    });
    mocks.prisma.map.delete.mockResolvedValue({ id: "map-1" });

    const updateResponse = await PUT(makePutRequest({ name: "Updated", description: "new" }), {
      params: Promise.resolve({ mapId: "map-1" }),
    });
    expect(updateResponse.status).toBe(200);
    expect(mocks.prisma.map.update).toHaveBeenCalledTimes(1);
    const updateBody = await updateResponse.json();
    expect(updateBody.map.prompt).toBeUndefined();

    const deleteResponse = await DELETE(makeDeleteRequest(), {
      params: Promise.resolve({ mapId: "map-1" }),
    });
    expect(deleteResponse.status).toBe(200);
    expect(mocks.prisma.map.delete).toHaveBeenCalledWith({ where: { id: "map-1" } });
  });

  it("does not expose map prompt in GET response payload", async () => {
    mocks.getUserId.mockResolvedValue("gm-1");
    mocks.prisma.map.findUnique.mockResolvedValue({
      ...buildMap(),
      prompt: "sensitive internal prompt",
    });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ mapId: "map-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map.prompt).toBeUndefined();
  });
});
