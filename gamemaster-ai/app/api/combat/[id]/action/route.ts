import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { canManageCampaign, getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import type { CombatParticipant } from "@/types";
import {
  calculateModifier,
  normalizeCombatRecord,
  parseCharacterStats,
  parseDamageDice,
  proficiencyBonus,
  resolveAttack,
  sanitizeNpcCombatStats,
  sanitizeParticipants,
  serializeLog,
  serializeParticipants,
} from "@/lib/combat/utils";

type CombatActionBody = {
  action?: string;
  actorId?: string;
  targetId?: string;
  damage?: number;
  attack?: boolean;
  actionType?: string;
};

function toSafeDamage(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(200, Math.round(numeric)));
}

/**
 * Computes a combatant's attack profile (attack bonus, damage dice, damage bonus)
 * server-side so attack resolution can never be influenced by the client.
 * - Players: best of STR/DEX modifier + proficiency; weapon damage from the
 *   equipped weapon's `properties.damage` ("NdM") or a sensible default.
 * - Enemies/NPCs: bounded `attackBonus`/`damageDice` from NPC stats, with defaults.
 */
async function getAttackProfile(actor: CombatParticipant, _sessionId: string) {
  if (actor.type === "player") {
    const character = await prisma.character.findUnique({
      where: { id: actor.id },
      select: {
        stats: true,
        level: true,
        inventoryItems: {
          where: { equipped: true, type: "Weapon" },
          select: { properties: true },
          take: 1,
        },
      },
    });

    const stats = parseCharacterStats(character?.stats ?? null);
    const strMod = calculateModifier(Number(stats.strength ?? 10));
    const dexMod = calculateModifier(Number(stats.dexterity ?? 10));
    const abilityMod = Math.max(strMod, dexMod);
    const attackBonus = abilityMod + proficiencyBonus(character?.level ?? 1);

    const weapon = character?.inventoryItems?.[0];
    let damageSpec: string | undefined;
    if (weapon?.properties) {
      try {
        const props = JSON.parse(weapon.properties);
        if (typeof props?.damage === "string") damageSpec = props.damage;
      } catch {
        /* ignore malformed properties */
      }
    }
    // Armed → 1d8 default, unarmed → 1d4.
    const damageDice = parseDamageDice(damageSpec, { count: 1, sides: weapon ? 8 : 4 });
    return { attackBonus, damageDice, damageBonus: abilityMod };
  }

  // Enemy / ally → NPC stat block.
  const npc = await prisma.nPC.findUnique({
    where: { id: actor.id },
    select: { stats: true },
  });
  const npcStats = sanitizeNpcCombatStats(parseCharacterStats(npc?.stats ?? null));
  const attackBonus = npcStats?.attackBonus ?? 3;
  const damageDice = parseDamageDice(npcStats?.damageDice, { count: 1, sides: 6 });
  return { attackBonus, damageDice, damageBonus: 0 };
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
    const targetId = payload.targetId;
    const target = targetId
      ? participants.find((participant) => participant.id === targetId)
      : undefined;
    const isAttack = payload.attack === true || payload.actionType === "attack";

    let damage = 0;
    let attackHit = false;
    let attackCrit = false;
    let attackRollTotal: number | null = null;
    if (isAttack && target) {
      // Server-authoritative attack resolution: roll d20 + attack bonus vs the
      // target's AC and roll damage on a hit. This is what finally lets PLAYERS
      // deal damage on their own turn (previously only the GM could move HP).
      const profile = await getAttackProfile(actionActor, combat.session.id);
      const outcome = resolveAttack({
        attackBonus: profile.attackBonus,
        targetAc: target.ac,
        damageDice: profile.damageDice,
        damageBonus: profile.damageBonus,
        attackerName: actionActor.name,
        targetName: target.name,
      });
      actionSummary += ` — ${outcome.breakdown}`;
      attackHit = outcome.hit;
      attackCrit = outcome.crit;
      attackRollTotal = outcome.attackRoll;
      if (outcome.hit) {
        damage = outcome.damage;
      }
    } else if (canManageCampaign(actorRole)) {
      // GM narrative/manual damage (no attack roll).
      damage = toSafeDamage(payload.damage);
    }

    if (target && damage > 0) {
      target.hp = Math.max(0, target.hp - damage);
      if (!isAttack) {
        actionSummary += ` → ${target.name} ${damage} hasar aldı`;
      }
      if (target.hp <= 0) {
        actionSummary += ` — ${target.name} etkisiz hale geldi`;
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

    let currentState: Record<string, unknown> = {};
    try {
      currentState = JSON.parse(combat.session.currentState || "{}") as Record<string, unknown>;
    } catch {
      currentState = {};
    }

    const serializedParticipants = serializeParticipants(participants);
    const serializedTurnOrder = serializeParticipants(syncTurnOrder);
    const serializedLog = serializeLog(nextLog);

    const updatedCombat = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.combat.updateMany({
        where: {
          id: combatId,
          participants: combat.participants,
          turnOrder: combat.turnOrder,
          status: combat.status,
          currentTurn: combat.currentTurn,
          log: combat.log,
        },
        data: {
          participants: serializedParticipants,
          turnOrder: serializedTurnOrder,
          status: nextStatus,
          log: serializedLog,
        },
      });

      if (updateResult.count !== 1) {
        return null;
      }

      const nextCombat = await tx.combat.findUnique({ where: { id: combatId } });
      if (!nextCombat) {
        return null;
      }

      await tx.gameSession.update({
        where: { id: combat.session.id },
        data: {
          currentState: JSON.stringify({
            ...currentState,
            inCombat: nextStatus === "active",
          }),
          updatedAt: new Date(),
        },
      });

      await tx.message.create({
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

      return nextCombat;
    });

    if (!updatedCombat) {
      return NextResponse.json(
        { success: false, error: "Savaş durumu değişti. Lütfen tekrar deneyin." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(updatedCombat),
      // Structured truth of what happened, so the narration layer can describe the
      // real mechanical outcome instead of guessing (unifies the two combat paths).
      resolution: {
        actorId: actionActor.id,
        actorName: actionActor.name,
        targetId: target?.id ?? null,
        targetName: target?.name ?? null,
        action: actionText,
        isAttack,
        hit: isAttack ? attackHit : damage > 0,
        crit: attackCrit,
        attackRoll: attackRollTotal,
        damage,
        targetHpRemaining: target?.hp ?? null,
        targetMaxHp: target?.maxHp ?? null,
        targetDefeated: target ? target.hp <= 0 : false,
        combatEnded: shouldEndCombat,
      },
    });
  } catch (error) {
    console.error("Combat action error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
