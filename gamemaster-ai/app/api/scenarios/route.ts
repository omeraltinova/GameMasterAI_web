
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitResponse, getClientIp, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { Prisma } from "@prisma/client";

// GET /api/scenarios
// List scenarios with filters (search, genre)
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimitResponse(ip, "GET:/api/scenarios", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const genre = searchParams.get("genre");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const offsetParam = parseInt(searchParams.get("offset") || "0");
    const limitBase = Number.isFinite(limitParam) ? limitParam : 20;
    const offsetBase = Number.isFinite(offsetParam) ? offsetParam : 0;
    const limit = Math.min(Math.max(limitBase, 1), 50);
    const offset = Math.max(offsetBase, 0);

    const where: Prisma.ScenarioWhereInput = {
      isSoftDeleted: false,
    };

    // Search filter
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
      ];
    }

    // Genre filter
    if (genre && genre !== "Tümü") {
      where.genre = genre;
    }

    const [scenarios, total] = await Promise.all([
      prisma.scenario.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: {
              username: true,
              id: true,
            },
          },
        },
      }),
      prisma.scenario.count({ where }),
    ]);

    return NextResponse.json({
      data: scenarios,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/scenarios
// Create a new scenario
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(session.user.email, "POST:/api/scenarios", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const body = await req.json();
    const { title, description, genre, difficulty, startingPrompt, tags, isAIGenerated, worldSettings } = body;

    if (!title || !description || !startingPrompt) {
      return NextResponse.json(
        { error: "Title, description and starting prompt are required" },
        { status: 400 }
      );
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
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

    const scenario = await prisma.scenario.create({
      data: {
        title,
        description,
        genre: genre || "Fantasy",
        difficulty: difficulty || "Medium",
        startingPrompt,
        tags: tags ? JSON.stringify(tags) : null,
        worldSettings: worldSettings ? JSON.stringify(worldSettings) : null,
        isAIGenerated: isAIGenerated || false,
        creatorId: user.id,
        isOfficial: user.role === "ADMIN", // Only admins create official scenarios by default
      },
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error("Error creating scenario:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
