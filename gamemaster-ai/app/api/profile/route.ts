import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  ACHIEVEMENT_DEFINITIONS,
  checkAchievements,
  type AchievementStats,
} from "@/lib/achievements";
import { getUserId, unauthorizedResponse } from "@/lib/auth/server";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import bcrypt from "bcryptjs";

// KULLANICI BİLGİLERİ (GET) — gizlilik ayarları + stats + achievements + activity
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse("Oturum açmanız gerekiyor");
    }

    const limited = rateLimitResponse(userId, "GET:/api/profile", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        profilePublic: true,
        showCharacters: true,
        showCampaigns: true,
        showScenarios: true,
        showStats: true,
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            class: true,
            level: true,
            createdAt: true,
          },
          orderBy: { level: "desc" },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        campaignPlayers: {
          select: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
              },
            },
            joinedAt: true,
          },
          orderBy: { joinedAt: "desc" },
        },
        _count: {
          select: {
            characters: true,
            campaigns: true,
            campaignPlayers: true,
            messages: true,
            scenarios: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // --- Stats hesaplama ---
    const playerMessageCount = await prisma.message.count({
      where: { senderId: userId, senderType: "PLAYER" },
    });

    const diceRolls = await prisma.diceRoll.findMany({
      where: { character: { userId } },
      select: { diceType: true, total: true, results: true },
    });

    const totalDiceRolls = diceRolls.length;
    const d20Rolls: number[] = [];
    let criticalSuccesses = 0;
    let criticalFailures = 0;

    diceRolls.forEach((roll) => {
      if (roll.diceType === "d20") {
        try {
          const results = JSON.parse(roll.results);
          if (Array.isArray(results)) {
            results.forEach((r: number) => {
              d20Rolls.push(r);
              if (r === 20) criticalSuccesses++;
              if (r === 1) criticalFailures++;
            });
          }
        } catch { /* ignore */ }
      }
    });

    const avgD20 =
      d20Rolls.length > 0
        ? Math.round(
            (d20Rolls.reduce((a, b) => a + b, 0) / d20Rolls.length) * 10
          ) / 10
        : 0;

    // Favori ırk ve sınıf
    const raceCounts: Record<string, number> = {};
    const classCounts: Record<string, number> = {};
    user.characters.forEach((c) => {
      raceCounts[c.race] = (raceCounts[c.race] || 0) + 1;
      classCounts[c.class] = (classCounts[c.class] || 0) + 1;
    });

    const favoriteRace =
      Object.entries(raceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const favoriteClass =
      Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const highestLevel = user.characters[0]?.level || 0;
    const completedCampaigns = user.campaigns.filter(
      (c) => c.status === "COMPLETED"
    ).length;
    const activeCampaigns = user.campaigns.filter(
      (c) => c.status === "ACTIVE"
    ).length;

    const stats = {
      totalCharacters: user._count.characters,
      totalCampaignsCreated: user._count.campaigns,
      totalCampaignsJoined: user._count.campaignPlayers,
      completedCampaigns,
      activeCampaigns,
      totalMessages: playerMessageCount,
      totalDiceRolls,
      totalScenarios: user._count.scenarios,
      criticalSuccesses,
      criticalFailures,
      avgD20,
      d20TotalRolls: d20Rolls.length,
      favoriteRace,
      favoriteClass,
      highestLevel,
    };

    // --- Başarım kontrolü ---
    const monthsSinceJoin = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );

    const achievementStats: AchievementStats = {
      totalCharacters: stats.totalCharacters,
      totalCampaignsCreated: stats.totalCampaignsCreated,
      totalCampaignsJoined: stats.totalCampaignsJoined,
      completedCampaigns,
      activeCampaigns,
      totalMessages: playerMessageCount,
      totalDiceRolls,
      totalScenarios: stats.totalScenarios,
      criticalSuccesses,
      criticalFailures,
      avgD20,
      d20TotalRolls: d20Rolls.length,
      favoriteRace,
      highestLevel,
      monthsSinceJoin,
    };

    const checkResults = checkAchievements(achievementStats);

    // Mevcut DB kayıtları
    let existingAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    let existingMap = new Map(
      existingAchievements.map((a) => [a.achievementId, a.unlockedAt])
    );

    // Yeni açılmış başarımları kalıcı olarak kaydet.
    const newlyUnlockedIds = checkResults
      .filter((r) => r.unlocked && !existingMap.has(r.id))
      .map((r) => r.id);

    if (newlyUnlockedIds.length > 0) {
      const unlockedAt = new Date();
      await prisma.userAchievement.createMany({
        data: newlyUnlockedIds.map((achievementId) => ({
          userId,
          achievementId,
          unlockedAt,
        })),
        skipDuplicates: true,
      });

      existingAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      });
      existingMap = new Map(
        existingAchievements.map((a) => [a.achievementId, a.unlockedAt])
      );
    }

    const achievements = checkResults.map((r) => {
      // Daha önce açılmış bir başarım, güncel stat eşiği düşse bile "açılmış" kalmalı.
      const storedUnlockedAt = existingMap.get(r.id) ?? null;
      const unlocked = Boolean(storedUnlockedAt) || r.unlocked;

      return {
        id: r.id,
        unlocked,
        unlockedAt: storedUnlockedAt ? storedUnlockedAt.toISOString() : null,
      };
    });

    // --- Son aktiviteler ---
    const recentCharacters = user.characters.slice(0, 5).map((c) => ({
      type: "character_created" as const,
      label: "Yeni karakter oluşturuldu",
      entityName: c.name,
      date: c.createdAt.toISOString(),
    }));

    const recentCampaigns = user.campaigns.slice(0, 5).map((c) => ({
      type: "campaign_created" as const,
      label: "Yeni oturum oluşturuldu",
      entityName: c.name,
      date: c.createdAt.toISOString(),
    }));

    const recentJoined = user.campaignPlayers
      .filter(
        (cp) => !user.campaigns.some((c) => c.id === cp.campaign.id)
      )
      .slice(0, 5)
      .map((cp) => ({
        type: "campaign_joined" as const,
        label: "Oturuma katıldı",
        entityName: cp.campaign.name,
        date: cp.joinedAt.toISOString(),
      }));

    const achievementLabelMap = new Map(
      ACHIEVEMENT_DEFINITIONS.map((def) => [def.id, def.label])
    );

    const recentAchievementUnlocks = existingAchievements
      .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
      .slice(0, 5)
      .map((achievement) => ({
        type: "achievement_unlocked" as const,
        label: "Başarım kazanıldı",
        entityName:
          achievementLabelMap.get(achievement.achievementId) ??
          achievement.achievementId,
        date: achievement.unlockedAt.toISOString(),
      }));

    const recentActivity = [
      ...recentCharacters,
      ...recentCampaigns,
      ...recentJoined,
      ...recentAchievementUnlocks,
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
        profilePublic: user.profilePublic,
        showCharacters: user.showCharacters,
        showCampaigns: user.showCampaigns,
        showScenarios: user.showScenarios,
        showStats: user.showStats,
        _count: user._count,
      },
      stats,
      achievements,
      recentActivity,
    });
  } catch (error) {
    console.error("Profil bilgileri hatası:", error);
    return NextResponse.json(
      { error: "Profil bilgileri alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

// KULLANICI GÜNCELLEME (PATCH) — gizlilik ayarları + bio dahil
export async function PATCH(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse("Oturum açmanız gerekiyor");
    }

    const limited = rateLimitResponse(userId, "PATCH:/api/profile", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const body = await req.json();
    const { name, privacy, bio } = body;
    const data: Record<string, unknown> = {};

    if (typeof name === "string") {
      if (name.trim().length < 3) {
        return NextResponse.json(
          { error: "Kullanıcı adı en az 3 karakter olmalıdır." },
          { status: 400 }
        );
      }

      // Kullanıcı adı değişmişse, başkası tarafından kullanılıyor mu kontrol et
      if (name !== currentUser.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: name,
            id: { not: userId },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Bu kullanıcı adı zaten kullanımda." },
            { status: 409 }
          );
        }
      }

      data.username = name;
    }

    // Bio alanı
    if (typeof bio === "string") {
      if (bio.length > 500) {
        return NextResponse.json(
          { error: "Biyografi en fazla 500 karakter olabilir." },
          { status: 400 }
        );
      }
      data.bio = bio;
    }

    // Gizlilik ayarları
    if (privacy && typeof privacy === "object") {
      const booleanFields = [
        "profilePublic",
        "showCharacters",
        "showCampaigns",
        "showScenarios",
        "showStats",
      ] as const;

      for (const field of booleanFields) {
        if (typeof privacy[field] === "boolean") {
          data[field] = privacy[field];
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek veri bulunamadı." },
        { status: 400 }
      );
    }

    // Güncelleme işlemi
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        username: true,
        email: true,
        bio: true,
        profilePublic: true,
        showCharacters: true,
        showCampaigns: true,
        showScenarios: true,
        showStats: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        privacy: {
          profilePublic: updatedUser.profilePublic,
          showCharacters: updatedUser.showCharacters,
          showCampaigns: updatedUser.showCampaigns,
          showScenarios: updatedUser.showScenarios,
          showStats: updatedUser.showStats,
        },
      },
    });
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Profil güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

// HESAP SİLME (DELETE)
export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse("Oturum açmanız gerekiyor");
    }

    const limited = rateLimitResponse(userId, "DELETE:/api/profile", RATE_LIMIT_TIERS.AUTH_SENSITIVE);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof (body as { currentPassword?: unknown }).currentPassword === "string"
      ? (body as { currentPassword: string }).currentPassword
      : "";

    if (currentPassword.trim().length < 6) {
      return NextResponse.json(
        { error: "Hesabı silmek için mevcut şifrenizi girmeniz gerekiyor." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mevcut şifre doğrulanamadı." },
        { status: 403 }
      );
    }

    // Transaction kullanarak ilişkisel veri bütünlüğünü koruyalım
    await prisma.$transaction(async (tx) => {
      // 1. Kullanıcının mesajlarını 'Anonim' yap (User silinince mesajlar kalsın ama kimin attığı null olsun)
      // veya isteğe bağlı silebilirsiniz. Burada null yapıyoruz.
      await tx.message.updateMany({
        where: { senderId: userId },
        data: { senderId: null, senderName: "Silinmiş Kullanıcı" },
      });

      // 2. Kullanıcının oluşturduğu senaryoları 'Anonim' yap
      await tx.scenario.updateMany({
        where: { creatorId: userId },
        data: { creatorId: null },
      });

      // 3. Kullanıcıyı sil (Character, Campaign, CampaignPlayer Cascade olduğu için otomatik silinir)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ success: true, message: "Hesap başarıyla silindi." });
  } catch (error) {
    console.error("Hesap silme hatası:", error);
    return NextResponse.json(
      { error: "Hesap silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
