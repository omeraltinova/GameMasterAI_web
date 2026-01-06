import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";

// GET /api/campaigns/:id - Get campaign details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch campaign with full relations
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        scenario: true,
        characters: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            character: {
              select: {
                id: true,
                name: true,
                level: true,
                race: true,
                class: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check if user has access (is creator or player)
    const hasAccess =
      campaign.creatorId === userId ||
      campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Calculate player count
    const playerCount = campaign.players.filter((p: any) => p.isActive).length;

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        playerCount,
      },
    });
  } catch (error) {
    console.error("Campaign fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/:id - Update campaign
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Check if campaign exists and user is creator
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.creatorId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.maxPlayers !== undefined) updateData.maxPlayers = body.maxPlayers;
    if (body.isMultiplayer !== undefined) updateData.isMultiplayer = body.isMultiplayer;

    if (body.scenarioId !== undefined) {
      if (campaign.status !== "DRAFT") {
        return NextResponse.json(
          { success: false, error: "Senaryo sadece taslak kampanyada degistirilebilir" },
          { status: 400 }
        );
      }

      const nextScenarioId = body.scenarioId || null;
      if (nextScenarioId) {
        const scenarioExists = await prisma.scenario.findUnique({
          where: { id: nextScenarioId },
          select: { id: true },
        });
        if (!scenarioExists) {
          return NextResponse.json(
            { success: false, error: "Senaryo bulunamadi" },
            { status: 404 }
          );
        }
      }

      updateData.scenarioId = nextScenarioId;
    }

    // Update campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/:id - Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if campaign exists and user is creator
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.creatorId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Delete campaign (cascade will delete related records)
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
