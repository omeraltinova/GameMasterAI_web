import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "PATCH:/api/admin/active-sessions/[id]", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { id: sessionId } = await params;
    const body = await req.json();
    const { action, resetType = "full", messageId, keepWorldSettings = true } = body ?? {};

    if (!action) {
      return NextResponse.json({ error: "Aksiyon gerekli" }, { status: 400 });
    }

    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        messages: { orderBy: { timestamp: "asc" } },
      },
    });

    if (!gameSession) {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 404 });
    }

    if (action === "force_close") {
      await prisma.campaign.update({
        where: { id: gameSession.campaignId },
        data: { status: "PAUSED" },
      });

      await prisma.message.create({
        data: {
          sessionId,
          senderType: "SYSTEM",
          senderName: "Sistem",
          content: "⛔ Oturum admin tarafından duraklatıldı.",
        },
      });

      await logAdminAction({
        adminId: session.user.id,
        action: "SESSION_FORCE_CLOSE",
        entityType: "GameSession",
        entityId: sessionId,
        metadata: {
          campaignId: gameSession.campaignId,
          campaignStatus: "PAUSED",
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "reset") {
      if (resetType === "full") {
        await prisma.message.deleteMany({
          where: { sessionId },
        });

        let newState: Record<string, unknown> = {
          location: "Başlangıç",
          timeOfDay: "morning",
          weather: "clear",
          activeNPCs: [],
          activeQuests: [],
          notes: "",
        };

        if (keepWorldSettings && gameSession.currentState) {
          try {
            const currentState = typeof gameSession.currentState === "string"
              ? JSON.parse(gameSession.currentState)
              : gameSession.currentState;
            if (currentState?.worldSettings) {
              newState = {
                ...newState,
                worldSettings: currentState.worldSettings,
                location: currentState.worldSettings.startingLocation?.name || "Başlangıç",
              };
            }
          } catch (error) {
            console.error("Admin reset state parse error:", error);
          }
        }

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            currentState: JSON.stringify(newState),
            updatedAt: new Date(),
          },
        });

        const welcomeMessage = await prisma.message.create({
          data: {
            sessionId,
            senderType: "SYSTEM",
            senderName: "Sistem",
            content: "🔄 Oyun sıfırlandı. Yeni bir maceraya hazır mısın?",
          },
        });

        let openingMessage = null;
        if (keepWorldSettings && (newState as any).worldSettings?.openingNarration) {
          openingMessage = await prisma.message.create({
            data: {
              sessionId,
              senderType: "GM",
              senderName: "Game Master",
              content: (newState as any).worldSettings.openingNarration,
            },
          });
        }

        await logAdminAction({
          adminId: session.user.id,
          action: "SESSION_RESET",
          entityType: "GameSession",
          entityId: sessionId,
          metadata: {
            resetType: "full",
            keepWorldSettings,
          },
        });

        return NextResponse.json({
          success: true,
          resetType: "full",
          newMessage: welcomeMessage,
          openingMessage,
        });
      }

      if (resetType === "from_message") {
        if (!messageId) {
          return NextResponse.json({ error: "messageId gerekli" }, { status: 400 });
        }

        const targetMessage = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!targetMessage || targetMessage.sessionId !== sessionId) {
          return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
        }

        const deletedMessages = await prisma.message.deleteMany({
          where: {
            sessionId,
            timestamp: { gt: targetMessage.timestamp },
          },
        });

        const restartMessage = await prisma.message.create({
          data: {
            sessionId,
            senderType: "SYSTEM",
            senderName: "Sistem",
            content: "⏪ Oyun bu noktadan yeniden başlatıldı.",
          },
        });

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });

        await logAdminAction({
          adminId: session.user.id,
          action: "SESSION_RESET",
          entityType: "GameSession",
          entityId: sessionId,
          metadata: {
            resetType: "from_message",
            fromMessageId: messageId,
            deletedCount: deletedMessages.count,
          },
        });

        return NextResponse.json({
          success: true,
          resetType: "from_message",
          fromMessageId: messageId,
          deletedCount: deletedMessages.count,
          newMessage: restartMessage,
        });
      }

      return NextResponse.json(
        { error: 'Geçersiz reset tipi. "full" veya "from_message" kullanın.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  } catch (error) {
    console.error("Admin session action error:", error);
    return NextResponse.json(
      { error: "İşlem başarısız" },
      { status: 500 }
    );
  }
}
