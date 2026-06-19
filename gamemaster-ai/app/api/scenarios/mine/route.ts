
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// GET /api/scenarios/mine
// Get current user's scenarios
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitResponse(
      session.user.email,
      "GET:/api/scenarios/mine",
      RATE_LIMIT_TIERS.READ
    );
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        isSoftDeleted: true,
        isSuspended: true,
        suspendedUntil: true,
      },
    });

    if (!user || user.isSoftDeleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return NextResponse.json({ error: "Hesabınız askıda olduğu için işlem yapılamaz" }, { status: 403 });
    }

    const scenarios = await prisma.scenario.findMany({
      where: {
        creatorId: user.id,
        isSoftDeleted: false,
      },
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
    console.error("Error fetching user scenarios:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
