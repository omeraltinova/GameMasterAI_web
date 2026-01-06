
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/scenarios/mine
// Get current user's scenarios
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const scenarios = await prisma.scenario.findMany({
      where: {
        creatorId: user.id,
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
