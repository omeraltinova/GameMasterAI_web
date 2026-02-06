import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";

// POST /api/campaigns/:id/join - Lobiye karakter ile katıl
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const body = await req.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "Karakter seçimi gerekli" },
        { status: 400 }
      );
    }

    // Oturumu kontrol et
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        players: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Oturum bulunamadı" },
        { status: 404 }
      );
    }

    // Karakteri kontrol et - kullanıcının olmalı
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: userId,
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Bu karakter size ait değil" },
        { status: 403 }
      );
    }

    // Karakterin başka oturumda olup olmadığını kontrol et
    if (character.campaignId && character.campaignId !== campaignId) {
      return NextResponse.json(
        { success: false, error: "Bu karakter başka bir oturumda" },
        { status: 400 }
      );
    }

    // Oturum dolu mu kontrol et
    const activePlayerCount = campaign.players.filter((p) => p.isActive).length;
    if (activePlayerCount >= campaign.maxPlayers) {
      return NextResponse.json(
        { success: false, error: "Oturum dolu" },
        { status: 400 }
      );
    }

    // Kullanıcı zaten lobide mi kontrol et
    const existingPlayer = campaign.players.find((p) => p.userId === userId);

    if (existingPlayer) {
      // Player kaydı var, karakteri güncelle
      await prisma.campaignPlayer.update({
        where: { id: existingPlayer.id },
        data: {
          characterId: characterId,
          isActive: true,
        },
      });

      // Karakterin campaignId'sini güncelle
      await prisma.character.update({
        where: { id: characterId },
        data: { campaignId: campaignId },
      });
    } else {
      // Yeni player kaydı oluştur
      await prisma.campaignPlayer.create({
        data: {
          campaignId: campaignId,
          userId: userId,
          characterId: characterId,
          isActive: true,
          joinedAt: new Date(),
        },
      });

      // Karakterin campaignId'sini güncelle
      await prisma.character.update({
        where: { id: characterId },
        data: { campaignId: campaignId },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Lobiye başarıyla katıldınız",
    });
  } catch (error) {
    console.error("Join lobby error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/:id/join - Lobiden ayrıl
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Player kaydını bul
    const player = await prisma.campaignPlayer.findFirst({
      where: {
        campaignId: campaignId,
        userId: userId,
      },
      include: {
        character: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { success: false, error: "Bu lobide değilsiniz" },
        { status: 404 }
      );
    }

    // Karakterin campaignId'sini temizle
    if (player.characterId) {
      await prisma.character.update({
        where: { id: player.characterId },
        data: { campaignId: null },
      });
    }

    // Player kaydını sil
    await prisma.campaignPlayer.delete({
      where: { id: player.id },
    });

    return NextResponse.json({
      success: true,
      message: "Lobiden ayrıldınız",
    });
  } catch (error) {
    console.error("Leave lobby error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}


