import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { normalizeCombatRecord, serializeLog } from "@/lib/combat/utils";

function parseLog(rawLog: string | null) {
  if (!rawLog || rawLog.trim().length === 0) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawLog) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "POST:/api/combat/[id]/end", RATE_LIMIT_TIERS.GAME_ACTION);
    if (limited) return limited;

    const { id: combatId } = await params;

    const combat = await prisma.combat.findUnique({
      where: { id: combatId },
      include: {
        session: {
          select: {
            id: true,
            currentState: true,
            campaign: {
              select: {
                creatorId: true,
                players: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!combat) {
      return NextResponse.json(
        { success: false, error: "Savaş bulunamadı" },
        { status: 404 },
      );
    }

    const actorRole = getCampaignActorRole(combat.session.campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return forbiddenResponse("Bu savaşa erişim yetkiniz yok");
    }
    if (!canManageCampaign(actorRole)) {
      return forbiddenResponse("Sadece oturum yöneticisi bu işlemi yapabilir");
    }

    const existingLog = parseLog(combat.log);
    const nextLog = [...existingLog, "Savaş manuel olarak sonlandırıldı."];

    const updatedCombat = await prisma.combat.update({
      where: { id: combatId },
      data: {
        status: "ended",
        log: serializeLog(nextLog),
      },
    });

    let currentState: Record<string, unknown> = {};
    try {
      currentState = JSON.parse(combat.session.currentState || "{}") as Record<string, unknown>;
    } catch {
      currentState = {};
    }

    await prisma.gameSession.update({
      where: { id: combat.session.id },
      data: {
        currentState: JSON.stringify({
          ...currentState,
          inCombat: false,
        }),
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        sessionId: combat.session.id,
        senderType: "COMBAT",
        senderName: "Combat Tracker",
        content: "🏁 Savaş sona erdi.",
        metadata: JSON.stringify({
          type: "combat_end",
          combatId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(updatedCombat),
    });
  } catch (error) {
    console.error("Combat end error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
