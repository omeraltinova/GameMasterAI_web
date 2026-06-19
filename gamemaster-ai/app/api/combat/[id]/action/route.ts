import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import {
  normalizeCombatRecord,
  sanitizeParticipants,
  serializeLog,
  serializeParticipants,
} from "@/lib/combat/utils";

type CombatActionBody = {
  action?: string;
  actorId?: string;
  targetId?: string;
  damage?: number;
};

function toSafeDamage(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(200, Math.round(numeric)));
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

    const limited = await rateLimitResponse(userId, "POST:/api/combat/[id]/action", RATE_LIMIT_TIERS.GAME_ACTION);
    if (limited) return limited;

    const { id: combatId } = await params;
    const payload = (await req.json().catch(() => ({}))) as CombatActionBody;

    if (!payload.action || typeof payload.action !== "string" || payload.action.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Aksiyon bilgisi gerekli" },
        { status: 400 },
      );
    }

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
                  select: { userId: true, characterId: true },
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

    if (combat.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Bu savaş sona ermiş" },
        { status: 400 },
      );
    }

    const participants = sanitizeParticipants(combat.participants);
    const turnOrder = sanitizeParticipants(combat.turnOrder);
    const currentTurnIndex = Math.max(0, combat.currentTurn || 0);
    const currentActor = turnOrder[currentTurnIndex % Math.max(1, turnOrder.length)];
    const actorId = payload.actorId || currentActor?.id;
    const actionText = payload.action.trim();

    if (!currentActor) {
      return NextResponse.json(
        { success: false, error: "Sıradaki katılımcı bulunamadı" },
        { status: 400 },
      );
    }

    if (!actorId || actorId !== currentActor.id) {
      return NextResponse.json(
        { success: false, error: "Sadece sırası gelen katılımcı aksiyon yapabilir" },
        { status: 403 },
      );
    }

    if (!canManageCampaign(actorRole)) {
      if (currentActor.type !== "player") {
        return NextResponse.json(
          { success: false, error: "Bu turda aksiyon yapma yetkiniz yok" },
          { status: 403 },
        );
      }

      const ownsCurrentActor = combat.session.campaign.players.some(
        (player) => player.userId === userId && player.characterId === currentActor.id,
      );
      if (!ownsCurrentActor) {
        return forbiddenResponse("Sadece kendi karakterinizin turunda aksiyon yapabilirsiniz");
      }
    }

    const actionActor = participants.find((participant) => participant.id === actorId);
    if (!actionActor) {
      return NextResponse.json(
        { success: false, error: "Aksiyonu yapan katılımcı bulunamadı" },
        { status: 400 },
      );
    }

    let actionSummary = `${actionActor.name}: ${actionText}`;
    const damage = canManageCampaign(actorRole) ? toSafeDamage(payload.damage) : 0;
    const targetId = payload.targetId;

    if (targetId && damage > 0) {
      const target = participants.find((participant) => participant.id === targetId);
      if (target) {
        target.hp = Math.max(0, target.hp - damage);
        actionSummary += ` → ${target.name} ${damage} hasar aldı`;
        if (target.hp <= 0) {
          actionSummary += ` ve etkisiz hale geldi`;
        }
      }
    }

    const syncTurnOrder = turnOrder.map((participant) => {
      const updated = participants.find((candidate) => candidate.id === participant.id);
      return updated ? { ...participant, hp: updated.hp, maxHp: updated.maxHp } : participant;
    });

    const log = Array.isArray(combat.log)
      ? combat.log
      : (() => {
          if (typeof combat.log === "string" && combat.log.trim().length > 0) {
            try {
              const parsed = JSON.parse(combat.log) as unknown;
              return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
            } catch {
              return [];
            }
          }
          return [];
        })();

    const nextLog = [...log, actionSummary];

    const aliveEnemies = participants.filter((participant) => participant.type === "enemy" && participant.hp > 0);
    const alivePlayers = participants.filter(
      (participant) => (participant.type === "player" || participant.type === "ally") && participant.hp > 0,
    );

    const shouldEndCombat = aliveEnemies.length === 0 || alivePlayers.length === 0;
    const nextStatus = shouldEndCombat ? "ended" : "active";

    const updatedCombat = await prisma.combat.update({
      where: { id: combatId },
      data: {
        participants: serializeParticipants(participants),
        turnOrder: serializeParticipants(syncTurnOrder),
        status: nextStatus,
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
          inCombat: nextStatus === "active",
        }),
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        sessionId: combat.session.id,
        senderType: "COMBAT",
        senderName: "Combat Tracker",
        content: shouldEndCombat ? `${actionSummary}. ⚔️ Savaş sona erdi.` : actionSummary,
        metadata: JSON.stringify({
          type: "combat_action",
          combatId,
          action: actionText,
          actorId: actionActor.id,
          targetId: targetId || null,
          damage,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(updatedCombat),
    });
  } catch (error) {
    console.error("Combat action error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
