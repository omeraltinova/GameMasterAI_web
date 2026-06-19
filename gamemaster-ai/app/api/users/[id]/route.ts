import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { checkAchievements, AchievementStats } from '@/lib/achievements';
import { rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/users/:id
 * Kullanıcının herkese açık profil ve istatistiklerini döndürür
 * Gizlilik ayarlarına göre veriyi filtreler
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await getUserId();
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const limited = await rateLimitResponse(currentUserId, "GET:/api/users/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id: userId } = await params;
    const isOwnProfile = currentUserId === userId;
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        role: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const canViewRole = isOwnProfile || currentUser.role === 'ADMIN';

    // Kullanıcı temel bilgileri + gizlilik ayarları + ilişkili veriler
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        isSoftDeleted: true,
        createdAt: true,
        profilePublic: true,
        showCharacters: true,
        showCampaigns: true,
        showScenarios: true,
        showStats: true,
        // Karakterler
        characters: {
          select: {
            id: true,
            name: true,
            race: true,
            class: true,
            level: true,
            experience: true,
            hp: true,
            maxHp: true,
            imageUrl: true,
            createdAt: true,
          },
          orderBy: { level: 'desc' },
        },
        // Oluşturduğu oturumlar
        campaigns: {
          where: {
            isSoftDeleted: false,
          },
          select: {
            id: true,
            name: true,
            status: true,
            isMultiplayer: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        // Katıldığı oturumlar
        campaignPlayers: {
          where: {
            campaign: {
              isSoftDeleted: false,
            },
          },
          select: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
                isMultiplayer: true,
                createdAt: true,
              },
            },
            joinedAt: true,
          },
          orderBy: { joinedAt: 'desc' },
        },
        // Senaryolar
        scenarios: {
          where: {
            isSoftDeleted: false,
          },
          select: {
            id: true,
            title: true,
            genre: true,
            difficulty: true,
            isOfficial: true,
            tags: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        // Sayılar
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

    if (!user || user.isSoftDeleted) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Profil gizli ve kendi profili değilse, sınırlı veri döndür
    if (!user.profilePublic && !isOwnProfile) {
      return NextResponse.json({
        success: true,
        profile: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          ...(canViewRole ? { role: user.role } : {}),
          createdAt: user.createdAt,
          isOwnProfile: false,
          isPrivate: true,
        },
        privacy: {
          profilePublic: false,
          showCharacters: false,
          showCampaigns: false,
          showScenarios: false,
          showStats: false,
        },
        stats: null,
        characters: [],
        campaigns: { created: [], joined: [] },
        scenarios: [],
        achievements: [],
      });
    }

    // Gizlilik durumlarını belirle (kendi profilinde her şey görünür)
    const showChars = isOwnProfile || user.showCharacters;
    const showCamps = isOwnProfile || user.showCampaigns;
    const showScens = isOwnProfile || user.showScenarios;
    const showStat = isOwnProfile || user.showStats;

    // Mesaj sayısı (sadece PLAYER tipindeki)
    const playerMessageCount = showStat
      ? await prisma.message.count({
          where: { senderId: userId, senderType: 'PLAYER', isSoftDeleted: false },
        })
      : 0;

    // Zar istatistikleri
    let totalDiceRolls = 0;
    const d20Rolls: number[] = [];
    let criticalSuccesses = 0;
    let criticalFailures = 0;

    if (showStat) {
      const diceRolls = await prisma.diceRoll.findMany({
        where: { character: { userId: userId } },
        select: { diceType: true, total: true, results: true },
      });

      totalDiceRolls = diceRolls.length;

      diceRolls.forEach((roll) => {
        if (roll.diceType === 'd20') {
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
    }

    const avgD20 = d20Rolls.length > 0
      ? Math.round((d20Rolls.reduce((a, b) => a + b, 0) / d20Rolls.length) * 10) / 10
      : 0;

    // Favori ırk ve sınıf hesapla
    const raceCounts: Record<string, number> = {};
    const classCounts: Record<string, number> = {};
    if (showChars) {
      user.characters.forEach((c) => {
        raceCounts[c.race] = (raceCounts[c.race] || 0) + 1;
        classCounts[c.class] = (classCounts[c.class] || 0) + 1;
      });
    }

    const favoriteRace = Object.entries(raceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const favoriteClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // En yüksek seviye karakter
    const highestLevelCharacter = user.characters[0] || null;

    // Tamamlanan oturumlar
    const completedCampaigns = user.campaigns.filter(c => c.status === 'COMPLETED').length;
    const activeCampaigns = user.campaigns.filter(c => c.status === 'ACTIVE').length;

    // Katılınan oturumlar (oluşturmadığı ama katıldığı)
    const joinedCampaigns = user.campaignPlayers
      .map(cp => cp.campaign)
      .filter(c => !user.campaigns.some(uc => uc.id === c.id));

    // Son aktivite
    const lastActivity = showStat
      ? await prisma.message.findFirst({
          where: { senderId: userId, isSoftDeleted: false },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true },
        })
      : null;

    // Senaryoların tag'lerini parse et
    const parsedScenarios = showScens
      ? user.scenarios.map((s) => {
          let tags: string[] = [];
          if (s.tags) {
            try { tags = JSON.parse(s.tags); } catch { /* ignore */ }
          }
          return { ...s, tags };
        })
      : [];

    // === Başarım kontrolü ve DB kaydı ===
    let achievementsResponse: { id: string; unlocked: boolean; unlockedAt: string | null }[] = [];

    if (showStat) {
      const monthsSinceJoin = Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      const achievementStats: AchievementStats = {
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
        highestLevel: highestLevelCharacter?.level || 0,
        monthsSinceJoin,
      };

      const checkResults = checkAchievements(achievementStats);

      // Mevcut DB kayıtlarını getir
      const existingAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      });

      const existingMap = new Map(
        existingAchievements.map((a) => [a.achievementId, a.unlockedAt])
      );

      // Tüm başarımlar için response oluştur.
      // Geçmişte açılan başarımlar, güncel stat eşiği düşse de korunur.
      achievementsResponse = checkResults.map((r) => {
        const storedUnlockedAt = existingMap.get(r.id) ?? null;
        const unlocked = Boolean(storedUnlockedAt) || r.unlocked;
        return {
          id: r.id,
          unlocked,
          unlockedAt: storedUnlockedAt ? storedUnlockedAt.toISOString() : null,
        };
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        ...(canViewRole ? { role: user.role } : {}),
        createdAt: user.createdAt,
        isOwnProfile,
        isPrivate: false,
      },
      privacy: {
        profilePublic: user.profilePublic,
        showCharacters: user.showCharacters,
        showCampaigns: user.showCampaigns,
        showScenarios: user.showScenarios,
        showStats: user.showStats,
      },
      stats: showStat ? {
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
        highestLevel: highestLevelCharacter?.level || 0,
        lastActivity: lastActivity?.timestamp || null,
      } : null,
      characters: showChars ? user.characters : [],
      campaigns: showCamps ? {
        created: user.campaigns,
        joined: joinedCampaigns,
      } : { created: [], joined: [] },
      scenarios: parsedScenarios,
      achievements: achievementsResponse,
    });
  } catch (error) {
    console.error('User profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
