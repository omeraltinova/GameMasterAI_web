import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";

// POST /api/campaigns/join - Davet kodu ile kampanyayı bul
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: "Davet kodu gerekli" },
        { status: 400 }
      );
    }

    // Kampanyayı davet kodu ile bul
    const campaign = await prisma.campaign.findFirst({
      where: {
        inviteCode: inviteCode.toUpperCase(),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        players: {
          where: { isActive: true },
        },
        scenario: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Geçersiz davet kodu" },
        { status: 404 }
      );
    }

    // Kampanya durumunu kontrol et
    if (campaign.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Bu kampanya tamamlanmış" },
        { status: 400 }
      );
    }

    // Kullanıcı zaten kampanyada mı
    const isAlreadyPlayer = campaign.players.some((p) => p.userId === userId);
    const isCreator = campaign.creatorId === userId;

    // Kampanya dolu mu
    const isFull = campaign.players.length >= campaign.maxPlayers;

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        creatorName: campaign.creator.username,
        scenarioTitle: campaign.scenario?.title,
        playerCount: campaign.players.length,
        maxPlayers: campaign.maxPlayers,
        status: campaign.status,
        isAlreadyPlayer: isAlreadyPlayer || isCreator,
        isFull: isFull && !isAlreadyPlayer && !isCreator,
      },
    });
  } catch (error) {
    console.error("Find campaign error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}

