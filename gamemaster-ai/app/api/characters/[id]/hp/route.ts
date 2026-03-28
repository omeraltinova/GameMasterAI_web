import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { characterHpUpdateSchema } from "@/lib/validators/characters";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Oturum acmaniz gerekiyor" }, { status: 401 });
    }

    const limited = rateLimitResponse(userId, "PUT:/api/characters/[id]/hp", RATE_LIMIT_TIERS.GAME_ACTION);
    if (limited) return limited;

    const { id } = await params;
    const character = await prisma.character.findUnique({
      where: { id },
      select: { id: true, userId: true, maxHp: true, hp: true },
    });

    if (!character) {
      return NextResponse.json({ success: false, error: "Karakter bulunamadi" }, { status: 404 });
    }

    if (character.userId !== userId) {
      return NextResponse.json({ success: false, error: "Bu karaktere erisim yetkiniz yok" }, { status: 403 });
    }

    const payload = await req.json();
    const parsed = characterHpUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Gecersiz HP verisi", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { hp, maxHp } = parsed.data;
    const effectiveMax = typeof maxHp === "number" ? maxHp : character.maxHp;
    const clampedHp = Math.min(Math.max(0, hp), effectiveMax);

    const updated = await prisma.character.update({
      where: { id },
      data: {
        hp: clampedHp,
        ...(typeof maxHp === "number" ? { maxHp } : {}),
      },
      select: {
        id: true,
        hp: true,
        maxHp: true,
        level: true,
        experience: true,
      },
    });

    return NextResponse.json({ success: true, character: updated });
  } catch (error) {
    console.error("HP update error:", error);
    return NextResponse.json({ success: false, error: "Sunucu hatasi olustu" }, { status: 500 });
  }
}
