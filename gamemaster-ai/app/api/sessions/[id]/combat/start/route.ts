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
  rollInitiative,
  serializeLog,
  serializeParticipants,
} from "@/lib/combat/utils";

function buildParticipantsFromSession(session: {
  campaign: {
    players: Array<{
      character: {
        id: string;
        name: string;
        hp: number;
        maxHp: number;
        stats: string;
      } | null;
    }>;
  };
  npcs: Array<{
    id: string;
    name: string;
    isHostile: boolean;
    stats: string | null;
  }>;
}) {
  const players: CombatParticipant[] = session.campaign.players
    .filter((player) => player.character !== null)
    .map((player) => {
      const character = player.character!;
      const stats = parseCharacterStats(character.stats);
      const dexterity = Number(stats.dexterity ?? 10);
      const ac = 10 + calculateModifier(Number.isFinite(dexterity) ? dexterity : 10);

      return {
        id: character.id,
        type: "player",
        name: character.name,
        initiative: rollInitiative(),
        hp: Math.max(0, character.hp),
        maxHp: Math.max(1, character.maxHp),
        ac: Math.max(1, ac),
      } satisfies CombatParticipant;
    });

  const enemies: CombatParticipant[] = session.npcs
    .filter((npc) => npc.isHostile)
    .map((npc) => {
      const npcStats = parseCharacterStats(npc.stats);
      const resolvedMaxHp = Math.max(1, Number(npcStats.maxHp ?? npcStats.hp ?? 10));
      const resolvedHp = Math.max(
        0,
        Math.min(resolvedMaxHp, Number(npcStats.hp ?? resolvedMaxHp)),
      );
      const resolvedAc = Math.max(1, Number(npcStats.ac ?? 10));

      return {
        id: npc.id,
        type: "enemy",
        name: npc.name,
        initiative: rollInitiative(),
        hp: resolvedHp,
        maxHp: resolvedMaxHp,
        ac: resolvedAc,
      } satisfies CombatParticipant;
    });

  return [...players, ...enemies];
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

    const limited = await rateLimitResponse(
      userId,
      "POST:/api/sessions/[id]/combat/start",
      RATE_LIMIT_TIERS.GAME_ACTION,
    );
    if (limited) return limited;

    const { id: sessionId } = await params;
    await req.json().catch(() => ({}));

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
            players: {
              include: {
                character: {
                  select: {
                    id: true,
                    name: true,
                    hp: true,
                    maxHp: true,
                    stats: true,
                  },
                },
              },
            },
          },
        },
        npcs: {
          select: {
            id: true,
            name: true,
            isHostile: true,
            stats: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session bulunamadı" },
        { status: 404 },
      );
    }

    const actorRole = getCampaignActorRole(session.campaign, userId);
    if (!hasCampaignAccess(actorRole)) {
      return forbiddenResponse("Bu session'a erişim yetkiniz yok");
    }
    if (!canManageCampaign(actorRole)) {
      return forbiddenResponse("Sadece oturum yöneticisi savaş başlatabilir");
    }

    const existingCombat = await prisma.combat.findFirst({
      where: {
        sessionId,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingCombat) {
      return NextResponse.json({
        success: true,
        combat: normalizeCombatRecord(existingCombat),
      });
    }

    const autoParticipants = buildParticipantsFromSession(session);
    const baseParticipants = autoParticipants;

    if (baseParticipants.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Savaş başlatmak için en az 2 katılımcı gerekli. Önce oyuncu veya düşman ekleyin.",
        },
        { status: 400 },
      );
    }

    const participants = baseParticipants.map((participant) => ({
      ...participant,
      initiative:
        Number.isFinite(participant.initiative) && participant.initiative > 0
          ? participant.initiative
          : rollInitiative(),
      hp: Math.max(0, participant.hp),
      maxHp: Math.max(1, participant.maxHp),
      ac: Math.max(1, participant.ac),
    }));

    const turnOrder = [...participants].sort((a, b) => b.initiative - a.initiative);
    const currentActor = turnOrder[0];
    const log = [
      `Round 1 başladı. İlk sıra: ${currentActor?.name || "Bilinmiyor"}`,
    ];

    const combat = await prisma.combat.create({
      data: {
        sessionId,
        participants: serializeParticipants(participants),
        turnOrder: serializeParticipants(turnOrder),
        currentTurn: 0,
        round: 1,
        status: "active",
        log: serializeLog(log),
      },
    });

    let currentState: Record<string, unknown> = {};
    try {
      currentState = JSON.parse(session.currentState || "{}") as Record<string, unknown>;
    } catch {
      currentState = {};
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentState: JSON.stringify({
          ...currentState,
          inCombat: true,
        }),
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        sessionId,
        senderType: "COMBAT",
        senderName: "Combat Tracker",
        content: `⚔️ Savaş başladı. İlk sıra: ${currentActor?.name || "Bilinmiyor"}`,
        metadata: JSON.stringify({
          type: "combat_start",
          combatId: combat.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(combat),
    });
  } catch (error) {
    console.error("Combat start error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}
