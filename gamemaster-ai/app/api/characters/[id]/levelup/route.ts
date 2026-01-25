import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { classes } from "@/lib/mock-data";
import { calculateModifier } from "@/lib/utils";

const parseStats = (stats: string | null) => {
  if (!stats) {
    return {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };
  }
  try {
    return JSON.parse(stats);
  } catch {
    return {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };
  }
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Oturum acmaniz gerekiyor" }, { status: 401 });
    }

    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        class: true,
        level: true,
        experience: true,
        hp: true,
        maxHp: true,
        stats: true,
      },
    });

    if (!character) {
      return NextResponse.json({ message: "Karakter bulunamadi" }, { status: 404 });
    }

    if (character.userId !== userId) {
      return NextResponse.json({ message: "Bu karaktere erisim yetkiniz yok" }, { status: 403 });
    }

    if (character.level >= 20) {
      return NextResponse.json({ message: "Maksimum seviyedesin" }, { status: 400 });
    }

    const nextLevelAt = character.level * 1000;
    if (character.experience < nextLevelAt) {
      return NextResponse.json(
        { message: "Seviye atlamak icin yeterli XP yok", nextLevelAt },
        { status: 400 }
      );
    }

    const classData = classes.find((cls) => cls.name === character.class);
    const hitDie = classData ? Number.parseInt(classData.hitDie.replace("d", ""), 10) : 8;
    const stats = parseStats(character.stats);
    const conMod = calculateModifier(stats.constitution ?? 10);
    const hpGain = Math.max(1, hitDie + conMod);

    const newLevel = character.level + 1;
    const newMaxHp = character.maxHp + hpGain;
    const newHp = Math.min(newMaxHp, character.hp + hpGain);

    const updated = await prisma.character.update({
      where: { id },
      data: {
        level: newLevel,
        maxHp: newMaxHp,
        hp: newHp,
      },
      select: {
        id: true,
        level: true,
        hp: true,
        maxHp: true,
        experience: true,
      },
    });

    return NextResponse.json({
      success: true,
      hpGain,
      nextLevelAt: newLevel * 1000,
      character: updated,
    });
  } catch (error) {
    console.error("Level up error:", error);
    return NextResponse.json({ message: "Sunucu hatasi olustu" }, { status: 500 });
  }
}
