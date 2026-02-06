// Paylaşılan başarım tanımları - Backend ve Frontend ortak kullanır

export type AchievementCategory = "general" | "combat" | "social" | "exploration";

export interface AchievementDefinition {
  id: string;
  label: string;
  description: string;
  category: AchievementCategory;
  color: string;
  iconName: string; // lucide-react icon adı - frontend'de map'lenir
}

export interface AchievementStats {
  totalCharacters: number;
  totalCampaignsCreated: number;
  totalCampaignsJoined: number;
  completedCampaigns: number;
  activeCampaigns: number;
  totalMessages: number;
  totalDiceRolls: number;
  totalScenarios: number;
  criticalSuccesses: number;
  criticalFailures: number;
  avgD20: number;
  d20TotalRolls: number;
  favoriteRace: string | null;
  highestLevel: number;
  monthsSinceJoin: number;
}

export interface AchievementCheckResult {
  id: string;
  unlocked: boolean;
}

// Tüm başarım tanımları
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // === Genel ===
  {
    id: "newcomer",
    label: "Yeni Maceraperest",
    description: "Hesap oluşturdu",
    iconName: "Footprints",
    color: "text-lime-400",
    category: "general",
  },
  {
    id: "veteran",
    label: "Veteran",
    description: "6+ aydır üye",
    iconName: "CalendarDays",
    color: "text-amber-400",
    category: "general",
  },
  {
    id: "ancient",
    label: "Kadim Ruh",
    description: "1+ yıldır üye",
    iconName: "Eye",
    color: "text-violet-400",
    category: "general",
  },
  {
    id: "first_character",
    label: "İlk Adım",
    description: "İlk karakterini oluşturdu",
    iconName: "User",
    color: "text-sky-400",
    category: "general",
  },
  {
    id: "character_collector",
    label: "Karakter Koleksiyoncusu",
    description: "5+ karakter oluşturdu",
    iconName: "Users",
    color: "text-indigo-400",
    category: "general",
  },
  {
    id: "experienced",
    label: "Deneyimli Oyuncu",
    description: "10+ oturuma katıldı",
    iconName: "Gamepad2",
    color: "text-purple-400",
    category: "general",
  },
  {
    id: "completionist",
    label: "Tamamlayıcı",
    description: "5+ oturumu tamamladı",
    iconName: "Trophy",
    color: "text-orange-400",
    category: "general",
  },
  {
    id: "legend",
    label: "Efsane Kahraman",
    description: "10+ seviye karakter",
    iconName: "Star",
    color: "text-yellow-400",
    category: "general",
  },
  {
    id: "mythic",
    label: "Efsanevi",
    description: "20. seviye karakter",
    iconName: "Crown",
    color: "text-amber-500",
    category: "general",
  },

  // === Savaş & Zar ===
  {
    id: "first_roll",
    label: "İlk Zar",
    description: "İlk zar atışını yaptı",
    iconName: "Dices",
    color: "text-teal-400",
    category: "combat",
  },
  {
    id: "dice_master",
    label: "Zar Ustası",
    description: "100+ zar atışı",
    iconName: "Dices",
    color: "text-green-400",
    category: "combat",
  },
  {
    id: "dice_addict",
    label: "Zar Bağımlısı",
    description: "500+ zar atışı",
    iconName: "Dices",
    color: "text-emerald-500",
    category: "combat",
  },
  {
    id: "lucky",
    label: "Şanslı",
    description: "10+ kritik başarı (nat 20)",
    iconName: "Sparkles",
    color: "text-pink-400",
    category: "combat",
  },
  {
    id: "blessed",
    label: "Tanrıların Gözdesi",
    description: "50+ kritik başarı",
    iconName: "Zap",
    color: "text-yellow-300",
    category: "combat",
  },
  {
    id: "cursed",
    label: "Lanetli",
    description: "10+ kritik başarısızlık (nat 1)",
    iconName: "Skull",
    color: "text-red-400",
    category: "combat",
  },
  {
    id: "hot_streak",
    label: "Ateş Çemberinde",
    description: "d20 ortalaması 12+",
    iconName: "Flame",
    color: "text-orange-500",
    category: "combat",
  },

  // === Sosyal & Hikaye ===
  {
    id: "first_words",
    label: "İlk Sözler",
    description: "10+ mesaj gönderdi",
    iconName: "MessageSquare",
    color: "text-sky-300",
    category: "social",
  },
  {
    id: "chatterbox",
    label: "Geveze",
    description: "100+ mesaj gönderdi",
    iconName: "MessageSquare",
    color: "text-blue-300",
    category: "social",
  },
  {
    id: "storyteller",
    label: "Hikaye Anlatıcısı",
    description: "500+ mesaj gönderdi",
    iconName: "BookOpen",
    color: "text-blue-400",
    category: "social",
  },
  {
    id: "bard",
    label: "Efsane Ozan",
    description: "1000+ mesaj gönderdi",
    iconName: "Drama",
    color: "text-fuchsia-400",
    category: "social",
  },
  {
    id: "first_campaign",
    label: "Macera Başlasın",
    description: "İlk oturuma katıldı",
    iconName: "Swords",
    color: "text-rose-400",
    category: "social",
  },
  {
    id: "party_animal",
    label: "Parti Hayvanı",
    description: "5+ çok oyunculu oturum",
    iconName: "HandMetal",
    color: "text-pink-500",
    category: "social",
  },

  // === Keşif & Yaratıcılık ===
  {
    id: "creator",
    label: "Dünya Yaratıcısı",
    description: "3+ senaryo oluşturdu",
    iconName: "Scroll",
    color: "text-cyan-400",
    category: "exploration",
  },
  {
    id: "campaign_leader",
    label: "Lider",
    description: "3+ oturum oluşturdu",
    iconName: "Compass",
    color: "text-emerald-400",
    category: "exploration",
  },
  {
    id: "warlord",
    label: "Savaş Lordu",
    description: "10+ oturum oluşturdu",
    iconName: "Shield",
    color: "text-red-500",
    category: "exploration",
  },
  {
    id: "treasure_hunter",
    label: "Hazine Avcısı",
    description: "Tüm ırkları denedi",
    iconName: "Gem",
    color: "text-amber-300",
    category: "exploration",
  },
  {
    id: "mountaineer",
    label: "Dağ Kaşifi",
    description: "10+ aktif oturum",
    iconName: "Mountain",
    color: "text-stone-400",
    category: "exploration",
  },
  {
    id: "perfectionist",
    label: "Mükemmeliyetçi",
    description: "15+ başarımın kilidini aç",
    iconName: "Target",
    color: "text-rose-500",
    category: "exploration",
  },
];

/**
 * İstatistiklere göre hangi başarımların açıldığını kontrol eder.
 * "perfectionist" başarımı diğerlerinin sonucuna bağlıdır.
 */
export function checkAchievements(stats: AchievementStats): AchievementCheckResult[] {
  const totalCampaigns = stats.totalCampaignsCreated + stats.totalCampaignsJoined;

  const checks: Record<string, boolean> = {
    newcomer: true,
    veteran: stats.monthsSinceJoin >= 6,
    ancient: stats.monthsSinceJoin >= 12,
    first_character: stats.totalCharacters >= 1,
    character_collector: stats.totalCharacters >= 5,
    experienced: totalCampaigns >= 10,
    completionist: stats.completedCampaigns >= 5,
    legend: stats.highestLevel >= 10,
    mythic: stats.highestLevel >= 20,
    first_roll: stats.totalDiceRolls >= 1,
    dice_master: stats.totalDiceRolls >= 100,
    dice_addict: stats.totalDiceRolls >= 500,
    lucky: stats.criticalSuccesses >= 10,
    blessed: stats.criticalSuccesses >= 50,
    cursed: stats.criticalFailures >= 10,
    hot_streak: stats.avgD20 >= 12 && stats.d20TotalRolls >= 20,
    first_words: stats.totalMessages >= 10,
    chatterbox: stats.totalMessages >= 100,
    storyteller: stats.totalMessages >= 500,
    bard: stats.totalMessages >= 1000,
    first_campaign: totalCampaigns >= 1,
    party_animal: stats.totalCampaignsJoined >= 5,
    creator: stats.totalScenarios >= 3,
    campaign_leader: stats.totalCampaignsCreated >= 3,
    warlord: stats.totalCampaignsCreated >= 10,
    treasure_hunter: stats.favoriteRace !== null && stats.totalCharacters >= 5,
    mountaineer: stats.activeCampaigns >= 10,
    perfectionist: false, // aşağıda hesaplanacak
  };

  // Perfectionist: 15+ başarımın kilidi açılmışsa
  const unlockedCount = Object.entries(checks).filter(
    ([key, val]) => key !== "perfectionist" && val
  ).length;
  checks.perfectionist = unlockedCount >= 15;

  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    id: def.id,
    unlocked: checks[def.id] ?? false,
  }));
}
