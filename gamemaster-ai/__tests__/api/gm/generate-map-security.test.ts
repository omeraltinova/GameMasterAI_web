import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
    map: {
      create: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  checkAIRateLimit: vi.fn(),
  normalizeImageUrl: vi.fn(),
  generateLocationImage: vi.fn(),
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

vi.mock("@/lib/security/aiRateLimit", () => ({
  checkAIRateLimit: mocks.checkAIRateLimit,
}));

vi.mock("@/lib/security/imageUrl", () => ({
  normalizeImageUrl: mocks.normalizeImageUrl,
}));

vi.mock("@/lib/ai/imageGenerator", () => ({
  generateLocationImage: mocks.generateLocationImage,
}));

import { POST } from "@/app/api/gm/generate-map/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("user-1");
  mocks.checkAIRateLimit.mockResolvedValue({ allowed: true });
  mocks.normalizeImageUrl.mockImplementation((url: string) => url);
  mocks.generateLocationImage.mockResolvedValue({
    success: true,
    imageUrl: "https://example.com/generated-map.png",
    revisedPrompt: "internal prompt rewrite",
  });
  mocks.prisma.gameSession.findUnique.mockResolvedValue({
    id: "session-1",
    campaign: {
      creatorId: "user-1",
      players: [],
      scenario: {
        title: "Ancient Dungeon",
        description: "desc",
      },
    },
  });
  mocks.prisma.map.create.mockResolvedValue({
    id: "map-1",
    sessionId: "session-1",
    name: "Dungeon Entrance",
    description: "Zindan Haritası - dungeon",
    imageUrl: "https://example.com/generated-map.png",
    isAIGenerated: true,
    prompt: "sensitive full prompt",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
});

describe("POST /api/gm/generate-map response security", () => {
  it("does not expose prompt or revisedPrompt in API payload", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/gm/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "session-1",
          locationName: "Dungeon Entrance",
          locationType: "dungeon",
          mapStyle: "dungeon",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.map.prompt).toBeUndefined();
    expect(body.revisedPrompt).toBeUndefined();
  });
});
