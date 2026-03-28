import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    scenario: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { GET } from "@/app/api/scenarios/official/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.scenario.findMany.mockResolvedValue([]);
});

describe("GET /api/scenarios/official security", () => {
  it("filters out soft-deleted official scenarios", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/scenarios/official?limit=10", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.scenario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isOfficial: true,
          isSoftDeleted: false,
        },
      }),
    );
  });
});
