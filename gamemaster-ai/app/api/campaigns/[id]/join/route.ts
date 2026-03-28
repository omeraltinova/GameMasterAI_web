import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { Prisma } from "@prisma/client";

const MAX_JOIN_RETRIES = 3;

type JoinAttemptResult =
  | { success: true }
  | { success: false; status: number; error: string };

function failJoin(status: number, error: string): JoinAttemptResult {
  return { success: false, status, error };
}

function isSerializationFailure(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2034"
  );
}

// POST /api/campaigns/:id/join - Lobiye karakter ile katıl
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "POST:/api/campaigns/[id]/join", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id: campaignId } = await params;
    const body = await req.json();
    const { characterId, inviteCode } = body as { characterId?: string; inviteCode?: string };

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "Karakter seçimi gerekli" },
        { status: 400 }
      );
    }

    const normalizedInviteCode = typeof inviteCode === "string" ? inviteCode.trim().toUpperCase() : "";
    let joinResult: JoinAttemptResult | null = null;

    for (let attempt = 0; attempt < MAX_JOIN_RETRIES; attempt += 1) {
      try {
        joinResult = await prisma.$transaction(async (tx) => {
          const campaign = await tx.campaign.findUnique({
            where: { id: campaignId },
            select: {
              id: true,
              creatorId: true,
              inviteCode: true,
              status: true,
              maxPlayers: true,
              isMultiplayer: true,
              isSoftDeleted: true,
            },
          });

          if (!campaign || campaign.isSoftDeleted) {
            return failJoin(404, "Oturum bulunamadı");
          }

          if (campaign.status === "COMPLETED") {
            return failJoin(400, "Bu oturum tamamlanmış");
          }

          const existingPlayer = await tx.campaignPlayer.findUnique({
            where: {
              campaignId_userId: {
                campaignId,
                userId,
              },
            },
            select: {
              id: true,
              isActive: true,
              characterId: true,
            },
          });

          const isCreator = campaign.creatorId === userId;

          if (!campaign.isMultiplayer && !isCreator) {
            return failJoin(403, "Solo oturuma sadece kurucu katılabilir");
          }

          const campaignInviteCode = campaign.inviteCode?.toUpperCase() || "";
          const hasValidInvite = Boolean(
            normalizedInviteCode &&
            campaignInviteCode &&
            normalizedInviteCode === campaignInviteCode
          );

          // Creator ve mevcut oyuncular haricinde davet kanıtı zorunlu.
          if (!isCreator && !existingPlayer && !hasValidInvite) {
            return failJoin(403, "Bu oturuma katılmak için geçerli davet kodu gerekli");
          }

          const character = await tx.character.findFirst({
            where: {
              id: characterId,
              userId,
            },
            select: {
              id: true,
              campaignId: true,
            },
          });

          if (!character) {
            return failJoin(403, "Bu karakter size ait değil");
          }

          if (character.campaignId && character.campaignId !== campaignId) {
            return failJoin(400, "Bu karakter başka bir oturumda");
          }

          const activePlayerCount = await tx.campaignPlayer.count({
            where: {
              campaignId,
              isActive: true,
            },
          });

          const willConsumeSeat = !existingPlayer || !existingPlayer.isActive;
          if (willConsumeSeat && activePlayerCount >= campaign.maxPlayers) {
            return failJoin(400, "Oturum dolu");
          }

          if (existingPlayer) {
            await tx.campaignPlayer.update({
              where: { id: existingPlayer.id },
              data: {
                characterId,
                isActive: true,
              },
            });

            if (existingPlayer.characterId !== characterId) {
              await tx.character.updateMany({
                where: {
                  id: existingPlayer.characterId,
                  campaignId,
                },
                data: {
                  campaignId: null,
                },
              });
            }
          } else {
            await tx.campaignPlayer.create({
              data: {
                campaignId,
                userId,
                characterId,
                isActive: true,
                joinedAt: new Date(),
              },
            });
          }

          await tx.character.update({
            where: { id: characterId },
            data: { campaignId },
          });

          return { success: true } as const;
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        break;
      } catch (error) {
        if (isSerializationFailure(error) && attempt < MAX_JOIN_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }

    if (!joinResult) {
      return NextResponse.json(
        { success: false, error: "Yoğunluk nedeniyle katılım doğrulanamadı. Lütfen tekrar deneyin." },
        { status: 409 }
      );
    }

    if (!joinResult.success) {
      return NextResponse.json(
        { success: false, error: joinResult.error },
        { status: joinResult.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lobiye başarıyla katıldınız",
    });
  } catch (error) {
    console.error("Join lobby error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/:id/join - Lobiden ayrıl
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const limited = rateLimitResponse(userId, "DELETE:/api/campaigns/[id]/join", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const { id: campaignId } = await params;

    // Player kaydını bul
    const player = await prisma.campaignPlayer.findFirst({
      where: {
        campaignId: campaignId,
        userId: userId,
      },
      include: {
        character: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { success: false, error: "Bu lobide değilsiniz" },
        { status: 404 }
      );
    }

    // Karakterin campaignId'sini temizle
    if (player.characterId) {
      await prisma.character.update({
        where: { id: player.characterId },
        data: { campaignId: null },
      });
    }

    // Player kaydını sil
    await prisma.campaignPlayer.delete({
      where: { id: player.id },
    });

    return NextResponse.json({
      success: true,
      message: "Lobiden ayrıldınız",
    });
  } catch (error) {
    console.error("Leave lobby error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası oluştu" },
      { status: 500 }
    );
  }
}
