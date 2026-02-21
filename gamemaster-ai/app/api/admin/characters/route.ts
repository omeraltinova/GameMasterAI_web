import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// KARAKTERLERİ LİSTELE (Pagination + Filtreler)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(session.user.id, "GET:/api/admin/characters", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    
    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    
    // Filter params
    const search = searchParams.get("search") || "";
    const race = searchParams.get("race") || "";
    const characterClass = searchParams.get("class") || "";
    const minLevel = parseInt(searchParams.get("minLevel") || "0") || 0;
    const maxLevel = parseInt(searchParams.get("maxLevel") || "20") || 20;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
      ];
    }
    
    if (race) {
      where.race = race;
    }
    
    if (characterClass) {
      where.class = characterClass;
    }
    
    where.level = {
      gte: minLevel,
      lte: maxLevel,
    };

    // Get characters with count
    const [characters, totalCount] = await Promise.all([
      prisma.character.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      }),
      prisma.character.count({ where }),
    ]);

    // Parse stats JSON
    const charactersWithParsedStats = characters.map((char) => ({
      ...char,
      stats: JSON.parse(char.stats || "{}"),
    }));

    return NextResponse.json({
      characters: charactersWithParsedStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Admin characters fetch error:", error);
    return NextResponse.json(
      { error: "Karakterler alınamadı" },
      { status: 500 }
    );
  }
}

// TOPLU KARAKTER SİL (opsiyonel - ileride eklenebilir)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(session.user.id, "DELETE:/api/admin/characters", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get("id");

    if (!characterId) {
      return NextResponse.json(
        { error: "Karakter ID gerekli" },
        { status: 400 }
      );
    }

    // Karakteri ve kullanıcısını bul
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Karakter bulunamadı" },
        { status: 404 }
      );
    }

    // Silme işlemi (cascade ile ilişkili veriler de silinir)
    await prisma.character.delete({
      where: { id: characterId },
    });

    // Audit log
    await logAdminAction({
      adminId: session.user.id,
      action: "CHARACTER_DELETE",
      entityType: "Character",
      entityId: characterId,
      metadata: {
        characterName: character.name,
        ownerUsername: character.user?.username,
        ownerId: character.userId,
        level: character.level,
        race: character.race,
        class: character.class,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin character delete error:", error);
    return NextResponse.json(
      { error: "Karakter silinemedi" },
      { status: 500 }
    );
  }
}
