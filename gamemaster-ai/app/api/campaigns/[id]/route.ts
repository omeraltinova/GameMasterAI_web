import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

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

    const limited = rateLimitResponse(userId, "GET:/api/campaigns/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id } = await params;

    // Fetch campaign with full relations
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        scenario: {
          select: {
            id: true,
            title: true,
            description: true,
            genre: true,
            difficulty: true,
            startingPrompt: true,
            tags: true,
            worldSettings: true,
            isOfficial: true,
            isFeatured: true,
            isSoftDeleted: true,
            createdAt: true,
          },
        },
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

    if (!campaign || campaign.isSoftDeleted) {
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
    const shouldExposeInviteCode = campaign.creatorId === userId && campaign.isMultiplayer;

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        inviteCode: shouldExposeInviteCode ? campaign.inviteCode : null,
        creator: campaign.creator
          ? {
              id: campaign.creator.id,
              username: campaign.creator.username,
              avatar: campaign.creator.avatar,
            }
          : null,
        scenario: campaign.scenario?.isSoftDeleted ? null : campaign.scenario,
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

    const limited = rateLimitResponse(userId, "PUT:/api/campaigns/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id } = await params;
    const body = await req.json();

    // Check if campaign exists and user is creator
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.isSoftDeleted) {
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
    if (body.isMultiplayer !== undefined) {
      updateData.isMultiplayer = body.isMultiplayer;
      if (body.isMultiplayer === false) {
        // Solo modda davet kodu olmamalı
        updateData.inviteCode = null;
      }
    }

    // Davet kodunu kapatma (null olarak set etme)
    if (body.inviteCode === null) {
      updateData.inviteCode = null;
    }

    if (body.scenarioId !== undefined) {
      if (campaign.status !== "DRAFT") {
        return NextResponse.json(
          { success: false, error: "Senaryo sadece taslak oturumda degistirilebilir" },
          { status: 400 }
        );
      }

      const nextScenarioId = body.scenarioId || null;
      if (nextScenarioId) {
        const scenarioActive = await prisma.scenario.findFirst({
          where: { id: nextScenarioId, isSoftDeleted: false },
          select: { id: true },
        });
        if (!scenarioActive) {
          return NextResponse.json(
            { success: false, error: "Senaryo bulunamadi veya pasif durumda" },
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

    const limited = rateLimitResponse(userId, "DELETE:/api/campaigns/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id } = await params;

    // Check if campaign exists and user is creator
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.isSoftDeleted) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.creatorId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Soft delete campaign
    await prisma.campaign.update({
      where: { id },
      data: {
        isSoftDeleted: true,
        softDeletedAt: new Date(),
        status: "PAUSED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign soft deleted successfully",
    });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
