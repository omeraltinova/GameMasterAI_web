import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateKeys(startDate: Date, days: number) {
  const keys: string[] = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < days; i += 1) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Güvenlik kontrolü: Sadece ADMIN erişebilir
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "GET:/api/admin/dashboard", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const start7 = new Date(today);
    start7.setDate(today.getDate() - 6);
    const start14 = new Date(today);
    start14.setDate(today.getDate() - 13);
    const start30 = new Date(today);
    start30.setDate(today.getDate() - 29);

    // Paralel olarak veritabanı sorgularını çalıştır
    const [
      userCount,
      characterCount,
      activeCampaignCount,
      scenarioCount,
      recentUsers,
      totalCampaigns,
      completedCampaigns,
      messagesLast7,
      activeUsersLast30Raw,
      campaignUsageLast14,
      topCreatorsRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.character.count(),
      prisma.campaign.count({
        where: { status: "ACTIVE" },
      }),
      prisma.scenario.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "COMPLETED" } }),
      // Son 7 gün mesajları (günlük aktif kullanıcı grafiği için)
      prisma.message.findMany({
        where: {
          senderId: { not: null },
          senderType: "PLAYER",
          timestamp: { gte: start7 },
        },
        select: {
          senderId: true,
          timestamp: true,
        },
      }),
      // Son 30 gün benzersiz aktif kullanıcı sayısı (sadece count)
      prisma.message.groupBy({
        by: ["senderId"],
        where: {
          senderId: { not: null },
          senderType: "PLAYER",
          timestamp: { gte: start30 },
        },
      }),
      prisma.campaign.findMany({
        where: {
          scenarioId: { not: null },
          createdAt: { gte: start14 },
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.scenario.groupBy({
        by: ["creatorId"],
        where: {
          creatorId: { not: null },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 5,
      }),
    ]);

    const dailyActiveMap = new Map<string, Set<string>>();
    const activeUsersLast7 = new Set<string>();

    for (const message of messagesLast7) {
      if (!message.senderId) continue;
      const dateKey = toDateKey(message.timestamp);
      activeUsersLast7.add(message.senderId);
      if (!dailyActiveMap.has(dateKey)) {
        dailyActiveMap.set(dateKey, new Set());
      }
      dailyActiveMap.get(dateKey)?.add(message.senderId);
    }

    const dailyKeys = buildDateKeys(start7, 7);
    const dailyActiveUsers = dailyKeys.map((key) => ({
      date: key,
      count: dailyActiveMap.get(key)?.size || 0,
    }));

    const scenarioUsageMap = new Map<string, number>();
    for (const campaign of campaignUsageLast14) {
      const dateKey = toDateKey(campaign.createdAt);
      scenarioUsageMap.set(dateKey, (scenarioUsageMap.get(dateKey) || 0) + 1);
    }
    const scenarioUsageKeys = buildDateKeys(start14, 14);
    const scenarioUsageTrend = scenarioUsageKeys.map((key) => ({
      date: key,
      count: scenarioUsageMap.get(key) || 0,
    }));

    const creatorIds = topCreatorsRaw
      .map((row) => row.creatorId)
      .filter((id): id is string => Boolean(id));
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, username: true, email: true },
        })
      : [];
    const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
const topCreators = topCreatorsRaw
      .filter((row): row is typeof row & { creatorId: string } => Boolean(row.creatorId))
      .map((row) => ({
        id: row.creatorId,
        username: creatorMap.get(row.creatorId)?.username || "Bilinmeyen",
        email: creatorMap.get(row.creatorId)?.email || "",
        scenarios: row._count.id,
      }));

    return NextResponse.json({
      stats: {
        users: userCount,
        characters: characterCount,
        activeCampaigns: activeCampaignCount,
        scenarios: scenarioCount,
      },
      recentUsers,
      analytics: {
        activeUsers: {
          today: dailyActiveUsers[dailyActiveUsers.length - 1]?.count || 0,
          last7Days: activeUsersLast7.size,
          last30Days: activeUsersLast30Raw.length,
        },
        dailyActiveUsers,
        campaignCompletion: {
          completed: completedCampaigns,
          total: totalCampaigns,
          rate: totalCampaigns ? completedCampaigns / totalCampaigns : 0,
        },
        scenarioUsageTrend,
        topCreators,
      },
    });
  } catch (error) {
    console.error("Admin dashboard verisi alınamadı:", error);
    return NextResponse.json(
      { error: "Veriler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
