
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitResponse, getClientIp, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/scenarios/[id]
// Get scenario detail
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip, "GET:/api/scenarios/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id } = await params;
    const scenario = await prisma.scenario.findFirst({
      where: { id, isSoftDeleted: false },
      include: {
        creator: {
          select: {
            username: true,
            id: true,
          },
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/scenarios/[id]
// Update scenario
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitResponse(session.user.email, "PUT:/api/scenarios/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const body = await req.json();
    const { title, description, genre, difficulty, startingPrompt, tags, worldSettings } = body;

    const scenario = await prisma.scenario.findFirst({
      where: { id },
    });

    if (!scenario || scenario.isSoftDeleted) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return NextResponse.json({ error: "Hesabınız askıda olduğu için işlem yapılamaz" }, { status: 403 });
    }

    // Check ownership or admin role
    if (scenario.creatorId !== user?.id && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (genre !== undefined) updateData.genre = genre;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (startingPrompt !== undefined) updateData.startingPrompt = startingPrompt;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;
    if (worldSettings !== undefined) {
      updateData.worldSettings = worldSettings ? JSON.stringify(worldSettings) : null;
    }

    const updatedScenario = await prisma.scenario.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedScenario);
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/scenarios/[id]
// Delete scenario
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitResponse(session.user.email, "DELETE:/api/scenarios/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const scenario = await prisma.scenario.findFirst({
      where: { id },
    });

    if (!scenario || scenario.isSoftDeleted) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      return NextResponse.json({ error: "Hesabınız askıda olduğu için işlem yapılamaz" }, { status: 403 });
    }

    // Check ownership or admin role
    if (scenario.creatorId !== user?.id && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.scenario.update({
      where: { id },
      data: {
        isSoftDeleted: true,
        softDeletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
