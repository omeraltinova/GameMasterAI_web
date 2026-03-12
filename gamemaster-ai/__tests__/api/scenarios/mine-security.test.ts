import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    scenario: {
      findMany: vi.fn(),
    },
  },
  getServerSession: vi.fn(),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimitResponse: mocks.rateLimitResponse,
  RATE_LIMIT_TIERS: {
    READ: { windowMs: 60_000, max: 100 },
  },
}));

import { GET } from "@/app/api/scenarios/mine/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue({
    user: {
      email: "user@example.com",
    },
  });
  mocks.rateLimitResponse.mockReturnValue(null);
  mocks.prisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    isSoftDeleted: false,
    isSuspended: false,
    suspendedUntil: null,
  });
  mocks.prisma.scenario.findMany.mockResolvedValue([]);
});

describe("GET /api/scenarios/mine security", () => {
  it("applies route-level rate limit", async () => {
    const limitedResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
    mocks.rateLimitResponse.mockReturnValue(limitedResponse);

    const response = await GET(new Request("http://localhost:3000/api/scenarios/mine", { method: "GET" }));

    expect(response.status).toBe(429);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(
      "user@example.com",
      "GET:/api/scenarios/mine",
      { windowMs: 60_000, max: 100 },
    );
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("continues to return user scenarios when not limited", async () => {
    mocks.prisma.scenario.findMany.mockResolvedValue([
      {
        id: "scenario-1",
        title: "My Scenario",
      },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/scenarios/mine", { method: "GET" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe("scenario-1");
  });
});
