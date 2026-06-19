
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getClientIp, rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// GET /api/scenarios/official
// Get only official scenarios
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip, "GET:/api/scenarios/official", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "10");
    const limitBase = Number.isFinite(limitParam) ? limitParam : 10;
    const limit = Math.min(Math.max(limitBase, 1), 50);

    const scenarios = await prisma.scenario.findMany({
      where: {
        isOfficial: true,
        isSoftDeleted: false,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error("Error fetching official scenarios:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
