import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

const defaultStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

const parseStats = (stats: string | null) => {
  if (!stats) return defaultStats;
  try {
    return JSON.parse(stats);
  } catch {
    return defaultStats;
  }
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "GET:/api/characters/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, message: "Karakter bulunamadı" },
        { status: 404 }
      );
    }

    if (character.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bu karaktere erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    const characterAppearance =
      (character as unknown as { appearance?: string | null }).appearance ?? null;

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.name,
        race: character.race,
        class: character.class,
        level: character.level,
        experience: character.experience,
        hp: character.hp,
        maxHp: character.maxHp,
        stats: parseStats(character.stats),
        background: character.background,
        appearance: characterAppearance,
        backstory: character.backstory,
        imageUrl: character.imageUrl,
        campaignId: character.campaignId,
        campaign: character.campaign,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      },
    });
  } catch (error) {
    console.error("Character get error:", error);
    return NextResponse.json(
      { success: false, message: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "PUT:/api/characters/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, message: "Karakter bulunamadı" },
        { status: 404 }
      );
    }

    if (character.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bu karaktere erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      race,
      class: characterClass,
      stats,
      background,
      appearance,
      backstory,
      imageUrl,
      hp,
      maxHp,
      level,
      experience,
    } = body;

    const data: Record<string, unknown> = {};

    if (typeof name === "string" && name.trim().length > 0) {
      data.name = name.trim();
    }

    if (typeof race === "string" && race.trim().length > 0) {
      data.race = race.trim();
    }

    if (typeof characterClass === "string" && characterClass.trim().length > 0) {
      data.class = characterClass.trim();
    }

    if (background === null) {
      data.background = null;
    } else if (typeof background === "string") {
      data.background = background;
    }

    if (appearance === null) {
      data.appearance = null;
    } else if (typeof appearance === "string") {
      data.appearance = appearance;
    }

    if (backstory === null) {
      data.backstory = null;
    } else if (typeof backstory === "string") {
      data.backstory = backstory;
    }

    if (imageUrl === null) {
      data.imageUrl = null;
    } else if (typeof imageUrl === "string") {
      data.imageUrl = imageUrl;
    }

    if (stats && typeof stats === "object") {
      data.stats = JSON.stringify(stats);
    }

    if (Number.isFinite(hp)) {
      data.hp = hp;
    }

    if (Number.isFinite(maxHp)) {
      data.maxHp = maxHp;
    }

    if (Number.isFinite(level)) {
      data.level = level;
    }

    if (Number.isFinite(experience)) {
      data.experience = experience;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "Güncellenecek veri bulunamadı" },
        { status: 400 }
      );
    }

    const updatedCharacter = await prisma.character.update({
      where: { id },
      data,
    });

    const updatedAppearance =
      (updatedCharacter as unknown as { appearance?: string | null }).appearance ?? null;

    return NextResponse.json({
      success: true,
      character: {
        id: updatedCharacter.id,
        name: updatedCharacter.name,
        race: updatedCharacter.race,
        class: updatedCharacter.class,
        level: updatedCharacter.level,
        experience: updatedCharacter.experience,
        hp: updatedCharacter.hp,
        maxHp: updatedCharacter.maxHp,
        stats: parseStats(updatedCharacter.stats),
        background: updatedCharacter.background,
        appearance: updatedAppearance,
        backstory: updatedCharacter.backstory,
        imageUrl: updatedCharacter.imageUrl,
        campaignId: updatedCharacter.campaignId,
        createdAt: updatedCharacter.createdAt,
        updatedAt: updatedCharacter.updatedAt,
      },
    });
  } catch (error) {
    console.error("Character update error:", error);
    return NextResponse.json(
      { success: false, message: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "DELETE:/api/characters/[id]", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, message: "Karakter bulunamadı" },
        { status: 404 }
      );
    }

    if (character.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Bu karaktere erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    await prisma.character.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Karakter silindi",
    });
  } catch (error) {
    console.error("Character delete error:", error);
    return NextResponse.json(
      { success: false, message: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}
