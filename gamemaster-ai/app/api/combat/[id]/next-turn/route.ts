import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import {
  normalizeCombatRecord,
  sanitizeParticipants,
  serializeLog,
} from "@/lib/combat/utils";

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

    const limited = await rateLimitResponse(userId, "POST:/api/combat/[id]/next-turn", RATE_LIMIT_TIERS.GAME_ACTION);
    if (limited) return limited;

    const { id: combatId } = await params;

    const combat = await prisma.combat.findUnique({
      where: { id: combatId },
      include: {
        session: {
          select: {
            id: true,
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

    if (combat.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Bu savaş sona ermiş" },
        { status: 400 },
      );
    }

    const turnOrder = sanitizeParticipants(combat.turnOrder);
    if (turnOrder.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sıra listesi boş" },
        { status: 400 },
      );
    }

    // Advance to the next *living* combatant, skipping those at 0 HP. Each time the
    // index wraps past the top of the order we begin a new round. If every other
    // combatant is down we just advance a single slot (combat is about to end).
    const turnCount = turnOrder.length;
    const startIndex = Math.max(0, combat.currentTurn) % turnCount;
    let nextTurn = startIndex;
    let nextRound = combat.round;
    let foundLiving = false;

    for (let step = 0; step < turnCount; step++) {
      nextTurn = (nextTurn + 1) % turnCount;
      if (nextTurn === 0) {
        nextRound += 1;
      }
      if ((turnOrder[nextTurn]?.hp ?? 0) > 0) {
        foundLiving = true;
        break;
      }
    }

    if (!foundLiving) {
      nextTurn = (startIndex + 1) % turnCount;
      nextRound = nextTurn === 0 ? combat.round + 1 : combat.round;
    }

    const nextActor = turnOrder[nextTurn];
    const startedNewRound = nextRound > combat.round;

    const existingLog = parseLog(combat.log);
    const logEntry =
      startedNewRound
        ? `Round ${nextRound} başladı. Sıra: ${nextActor?.name || "Bilinmiyor"}`
        : `Sıra: ${nextActor?.name || "Bilinmiyor"}`;
    const nextLog = [...existingLog, logEntry];

    const updatedCombat = await prisma.combat.update({
      where: { id: combatId },
      data: {
        currentTurn: nextTurn,
        round: nextRound,
        log: serializeLog(nextLog),
      },
    });

    await prisma.gameSession.update({
      where: { id: combat.session.id },
      data: { updatedAt: new Date() },
    });

    await prisma.message.create({
      data: {
        sessionId: combat.session.id,
        senderType: "COMBAT",
        senderName: "Combat Tracker",
        content: `➡️ ${logEntry}`,
        metadata: JSON.stringify({
          type: "combat_next_turn",
          combatId,
          round: nextRound,
          currentTurn: nextTurn,
          actorId: nextActor?.id || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(updatedCombat),
    });
  } catch (error) {
    console.error("Combat next turn error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
