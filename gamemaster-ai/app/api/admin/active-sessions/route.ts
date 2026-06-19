import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

const CONTEXT_PREVIEW_LIMIT = 180;

function summarizeText(text?: string | null) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= CONTEXT_PREVIEW_LIMIT) return trimmed;
  return `${trimmed.slice(0, CONTEXT_PREVIEW_LIMIT)}…`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "GET:/api/admin/active-sessions", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const campaigns = await prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: {
        creator: { select: { username: true, email: true } },
        scenario: { select: { id: true, title: true } },
        _count: { select: { players: true } },
        sessions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: {
            messages: {
              orderBy: { timestamp: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    const activeSessions = campaigns.map((campaign) => {
      const latestSession = campaign.sessions[0] || null;
      const lastMessages = latestSession?.messages
        ? [...latestSession.messages]
            .reverse()
            .map((msg) => ({
              id: msg.id,
              senderType: msg.senderType,
              senderName: msg.senderName,
              content: msg.content,
              timestamp: msg.timestamp,
            }))
        : [];

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignStatus: campaign.status,
        updatedAt: campaign.updatedAt,
        creator: campaign.creator,
        scenario: campaign.scenario,
        playersCount: campaign._count.players,
        session: latestSession
          ? {
              id: latestSession.id,
              updatedAt: latestSession.updatedAt,
              aiContext: latestSession.aiContext || "",
              aiContextSummary: summarizeText(latestSession.aiContext),
              lastMessages,
            }
          : null,
      };
    });

    return NextResponse.json({ sessions: activeSessions });
  } catch (error) {
    console.error("Aktif oturumlar alınamadı:", error);
    return NextResponse.json(
      { error: "Aktif oturumlar alınamadı" },
      { status: 500 }
    );
  }
}
