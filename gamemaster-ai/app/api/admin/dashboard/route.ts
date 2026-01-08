import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Güvenlik kontrolü: Sadece ADMIN erişebilir
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Paralel olarak veritabanı sorgularını çalıştır
    const [userCount, characterCount, activeCampaignCount, scenarioCount, recentUsers] = await Promise.all([
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
    ]);

    return NextResponse.json({
      stats: {
        users: userCount,
        characters: characterCount,
        activeCampaigns: activeCampaignCount,
        scenarios: scenarioCount,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin dashboard verisi alınamadı:", error);
    return NextResponse.json(
      { error: "Veriler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}