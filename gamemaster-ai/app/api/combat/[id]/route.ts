import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { normalizeCombatRecord } from "@/lib/combat/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const limited = await rateLimitResponse(userId, "GET:/api/combat/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id: combatId } = await params;

    const combat = await prisma.combat.findUnique({
      where: { id: combatId },
      include: {
        session: {
          select: {
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

    return NextResponse.json({
      success: true,
      combat: normalizeCombatRecord(combat),
    });
  } catch (error) {
    console.error("Combat get error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 },
    );
  }
}

