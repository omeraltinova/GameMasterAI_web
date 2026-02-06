"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  Spinner,
  Button,
  Progress,
} from "@/components/ui";
import {
  ArrowLeft,
  User,
  Users,
  Swords,
  Dices,
  MessageSquare,
  Crown,
  Shield,
  Star,
  Trophy,
  Clock,
  Scroll,
  Target,
  Sparkles,
  Heart,
  TrendingUp,
  CalendarDays,
  Gamepad2,
  Flame,
  Skull,
  Zap,
  BookOpen,
  Gem,
  Mountain,
  Compass,
  HandMetal,
  Drama,
  Eye,
  Footprints,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Lock,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCategory,
} from "@/lib/achievements";

// icon adı -> Lucide bileşeni eşlemesi
const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, CalendarDays, Eye, User, Users, Gamepad2, Trophy, Star, Crown,
  Dices, Sparkles, Zap, Skull, Flame, MessageSquare, BookOpen, Drama, Swords,
  HandMetal, Scroll, Compass, Shield, Gem, Mountain, Target,
};

interface ProfileData {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
  createdAt: string;
  isOwnProfile: boolean;
  isPrivate?: boolean;
}

interface PrivacyData {
  profilePublic: boolean;
  showCharacters: boolean;
  showCampaigns: boolean;
  showScenarios: boolean;
  showStats: boolean;
}

interface ScenarioData {
  id: string;
  title: string;
  genre: string;
  difficulty: string;
  isOfficial: boolean;
  tags: string[];
  createdAt: string;
}

interface StatsData {
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
  favoriteClass: string | null;
  highestLevel: number;
  lastActivity: string | null;
}

interface CharacterData {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  imageUrl: string | null;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  isMultiplayer: boolean;
  createdAt: string;
}

interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  color: string;
  category: AchievementCategory;
  unlockedAt: string | null;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE": return "Aktif";
    case "PAUSED": return "Duraklatıldı";
    case "COMPLETED": return "Tamamlandı";
    case "DRAFT": return "Taslak";
    default: return status;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "PAUSED": return "warning" as const;
    case "COMPLETED": return "primary" as const;
    case "DRAFT": return "outline" as const;
    default: return "default" as const;
  }
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Bugün";
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} aydır üye`;
  const years = Math.floor(months / 12);
  return `${years} yıldan fazladır üye`;
}

function formatUnlockedDate(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function memberSince(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "Yeni üye";
  if (months < 12) return `${months} aydır üye`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} yıldır üye`;
  return `${years} yıl ${remainingMonths} aydır üye`;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [campaigns, setCampaigns] = useState<{
    created: CampaignData[];
    joined: CampaignData[];
  }>({ created: [], joined: [] });
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacyData | null>(null);
  const [apiAchievements, setApiAchievements] = useState<{ id: string; unlockedAt: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Kullanıcı bulunamadı");
          } else {
            setError("Profil yüklenemedi");
          }
          return;
        }
        const data = await res.json();
        if (data.success) {
          setProfile(data.profile);
          setStats(data.stats);
          setCharacters(data.characters || []);
          setCampaigns(data.campaigns || { created: [], joined: [] });
          setScenarios(data.scenarios || []);
          setPrivacySettings(data.privacy || null);
          setApiAchievements(data.achievements || []);
        }
      } catch {
        setError("Sunucu hatası");
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchProfile();
  }, [userId]);

  // API'den gelen başarım verisini tanımlarla birleştir
  const finalAchievements: Achievement[] = useMemo(() => {
    if (apiAchievements.length === 0) return [];

    const apiMap = new Map(
      apiAchievements.map((a) => [a.id, a.unlockedAt])
    );

    return ACHIEVEMENT_DEFINITIONS.map((def) => ({
      id: def.id,
      label: def.label,
      description: def.description,
      icon: ICON_MAP[def.iconName] || Star,
      color: def.color,
      category: def.category,
      unlocked: apiMap.get(def.id) !== null && apiMap.get(def.id) !== undefined,
      unlockedAt: apiMap.get(def.id) ?? null,
    }));
  }, [apiAchievements]);

  const [showAllAchievements, setShowAllAchievements] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <User className="h-16 w-16 text-foreground-muted" />
        <h2 className="text-xl font-bold">{error || "Kullanıcı bulunamadı"}</h2>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
      </div>
    );
  }

  // Profil tamamen gizli ise
  if (profile.isPrivate && !profile.isOwnProfile) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Oyuncu Profili</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar src={profile.avatar ?? undefined} fallback={profile.username} size="xl" />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                <p className="text-foreground-secondary flex items-center justify-center sm:justify-start gap-2 mt-2">
                  <CalendarDays className="h-4 w-4" />
                  {memberSince(profile.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <Lock className="h-12 w-12 text-foreground-muted" />
              <h3 className="text-lg font-semibold">Bu profil gizli</h3>
              <p className="text-foreground-muted max-w-md">
                Bu kullanıcı profilini gizli tutmayı tercih ediyor. Karakter, oturum ve istatistik bilgileri görüntülenemiyor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

    const allCampaigns = [...campaigns.created, ...campaigns.joined];
    const unlockedAchievements = finalAchievements.filter((a) => a.unlocked);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Oyuncu Profili</h1>
      </div>

      {/* Kendi profil gizlilik uyarısı */}
      {profile.isOwnProfile && privacySettings && !privacySettings.profilePublic && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20">
          <Lock className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">Profiliniz gizli</p>
            <p className="text-xs text-warning/70">Profiliniz başkaları tarafından görüntülenemiyor. Bu sayfayı sadece siz görebiliyorsunuz.</p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              src={profile.avatar ?? undefined}
              fallback={profile.username}
              size="xl"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                <div className="flex items-center gap-2">
                  {profile.role === "ADMIN" && (
                    <Badge variant="danger" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  {profile.isOwnProfile && (
                    <Badge variant="primary" className="gap-1">Sen</Badge>
                  )}
                </div>
              </div>
              <p className="text-foreground-secondary flex items-center justify-center sm:justify-start gap-2 mt-1">
                <CalendarDays className="h-4 w-4" />
                {memberSince(profile.createdAt)}
              </p>
              {stats?.lastActivity && (
                <p className="text-foreground-muted text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Son aktivite: {timeAgo(stats.lastActivity)}
                </p>
              )}
              {/* Favori bilgileri */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {stats?.favoriteRace && (
                  <Badge variant="outline" className="gap-1">
                    <Heart className="h-3 w-3" />
                    {stats.favoriteRace}
                  </Badge>
                )}
                {stats?.favoriteClass && (
                  <Badge variant="outline" className="gap-1">
                    <Swords className="h-3 w-3" />
                    {stats.favoriteClass}
                  </Badge>
                )}
              </div>
            </div>
            {profile.isOwnProfile && (
              <Link
                href="/profile"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground-secondary hover:text-foreground shrink-0 self-start"
              >
                <Settings className="h-3.5 w-3.5" />
                Profili Düzenle
              </Link>
            )}
          </div>
          {profile.isOwnProfile && (
            <Link
              href="/profile"
              className="sm:hidden inline-flex items-center justify-center gap-1.5 mt-4 w-full px-3 py-2 rounded-lg text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground-secondary hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              Profili Düzenle
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Karakter", value: stats.totalCharacters, icon: User, color: "text-primary" },
            { label: "Oturum", value: stats.totalCampaignsCreated + stats.totalCampaignsJoined, icon: Swords, color: "text-secondary" },
            { label: "Tamamlanan", value: stats.completedCampaigns, icon: Trophy, color: "text-success" },
            { label: "Mesaj", value: stats.totalMessages, icon: MessageSquare, color: "text-info" },
            { label: "Zar Atışı", value: stats.totalDiceRolls, icon: Dices, color: "text-warning" },
            { label: "En Yüksek Lv.", value: stats.highestLevel, icon: TrendingUp, color: "text-accent" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <stat.icon className={cn("h-5 w-5 mx-auto mb-2", stat.color)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-foreground-muted">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats hidden message */}
      {!stats && !profile.isOwnProfile && (
        <HiddenSection icon={EyeOff} message="Bu kullanıcı istatistiklerini gizli tutuyor" />
      )}

      {/* Kendi profilde istatistik gizli uyarısı */}
      {profile.isOwnProfile && privacySettings && !privacySettings.showStats && (
        <OwnHiddenBanner message="İstatistikleriniz başkaları için gizli" />
      )}

      {/* Dice Statistics */}
      {stats && stats.totalDiceRolls > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dices className="h-5 w-5 text-primary" />
              Zar İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-background-elevated text-center">
                <p className="text-sm text-foreground-muted">d20 Ortalaması</p>
                <p className="text-3xl font-bold mt-1">{stats.avgD20}</p>
                <p className="text-xs text-foreground-muted">{stats.d20TotalRolls} atış</p>
              </div>
              <div className="p-4 rounded-lg bg-background-elevated text-center">
                <p className="text-sm text-foreground-muted">Kritik Başarı</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.criticalSuccesses}</p>
                <p className="text-xs text-foreground-muted">
                  {stats.d20TotalRolls > 0
                    ? `%${Math.round((stats.criticalSuccesses / stats.d20TotalRolls) * 100)}`
                    : "-"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background-elevated text-center">
                <p className="text-sm text-foreground-muted">Kritik Başarısızlık</p>
                <p className="text-3xl font-bold text-danger mt-1">{stats.criticalFailures}</p>
                <p className="text-xs text-foreground-muted">
                  {stats.d20TotalRolls > 0
                    ? `%${Math.round((stats.criticalFailures / stats.d20TotalRolls) * 100)}`
                    : "-"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background-elevated text-center">
                <p className="text-sm text-foreground-muted">Toplam Atış</p>
                <p className="text-3xl font-bold mt-1">{stats.totalDiceRolls}</p>
                <p className="text-xs text-foreground-muted">Tüm zarlar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Başarımlar
              <Badge variant="outline" size="sm">
                {unlockedAchievements.length}/{finalAchievements.length}
              </Badge>
            </CardTitle>
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground-secondary hover:text-foreground"
            >
              {showAllAchievements ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Daralt
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Tümünü Göster
                </>
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Kısa görünüm - sadece açılmış başarımlar */}
          {!showAllAchievements ? (
            <div className="space-y-4">
              {unlockedAchievements.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {unlockedAchievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <div
                        key={achievement.id}
                        className="p-3 rounded-lg border bg-background-elevated border-border-hover text-center transition-all hover:scale-[1.03]"
                        title={achievement.unlockedAt ? `${formatUnlockedDate(achievement.unlockedAt)} tarihinde açıldı` : undefined}
                      >
                        <Icon className={cn("h-6 w-6 mx-auto mb-2", achievement.color)} />
                        <p className="text-sm font-medium">{achievement.label}</p>
                        <p className="text-xs text-foreground-muted mt-0.5">{achievement.description}</p>
                        {achievement.unlockedAt && (
                          <p className="text-[10px] text-foreground-muted/60 mt-1">
                            {formatUnlockedDate(achievement.unlockedAt)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-foreground-muted py-4">Henüz açılmış başarım yok</p>
              )}
              {finalAchievements.length - unlockedAchievements.length > 0 && (
                <p className="text-center text-sm text-foreground-muted">
                  +{finalAchievements.length - unlockedAchievements.length} kilitli başarım
                </p>
              )}
            </div>
          ) : (
            /* Tam görünüm - kategorilere ayrılmış */
            <div className="space-y-6">
              {([
                { key: "general", label: "Genel", icon: Star },
                { key: "combat", label: "Savaş & Zar", icon: Swords },
                { key: "social", label: "Sosyal & Hikaye", icon: MessageSquare },
                { key: "exploration", label: "Keşif & Yaratıcılık", icon: Compass },
              ] as const).map(({ key, label, icon: CatIcon }) => {
                const categoryAchievements = finalAchievements.filter((a) => a.category === key);
                const categoryUnlocked = categoryAchievements.filter((a) => a.unlocked).length;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{label}</h4>
                      <span className="text-xs text-foreground-muted">
                        ({categoryUnlocked}/{categoryAchievements.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {categoryAchievements.map((achievement) => {
                        const Icon = achievement.icon;
                        return (
                          <div
                            key={achievement.id}
                            className={cn(
                              "p-3 rounded-lg border text-center transition-all",
                              achievement.unlocked
                                ? "bg-background-elevated border-border-hover hover:scale-[1.03]"
                                : "bg-background-secondary/30 border-border/50 opacity-50 grayscale"
                            )}
                            title={achievement.unlockedAt ? `${formatUnlockedDate(achievement.unlockedAt)} tarihinde açıldı` : undefined}
                          >
                            <Icon
                              className={cn(
                                "h-6 w-6 mx-auto mb-2",
                                achievement.unlocked ? achievement.color : "text-foreground-muted"
                              )}
                            />
                            <p className="text-sm font-medium">{achievement.label}</p>
                            <p className="text-xs text-foreground-muted mt-0.5">{achievement.description}</p>
                            {achievement.unlocked && achievement.unlockedAt && (
                              <p className="text-[10px] text-foreground-muted/60 mt-1">
                                {formatUnlockedDate(achievement.unlockedAt)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Characters & Campaigns grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Characters */}
        {(privacySettings?.showCharacters || profile.isOwnProfile) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Karakterler
                <Badge variant="outline" size="sm">{characters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.isOwnProfile && privacySettings && !privacySettings.showCharacters && (
                <OwnHiddenBanner message="Karakterleriniz başkaları için gizli" />
              )}
              {characters.length === 0 ? (
                <p className="text-foreground-muted text-center py-6">Henüz karakter yok</p>
              ) : (
                <div className="space-y-3">
                  {characters.slice(0, 6).map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {char.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{char.name}</p>
                        <p className="text-xs text-foreground-secondary">
                          {char.race} {char.class}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-foreground-muted">
                          <Heart className="h-3 w-3 text-danger" />
                          {char.hp}/{char.maxHp}
                        </div>
                      </div>
                    </div>
                  ))}
                  {characters.length > 6 && (
                    <p className="text-center text-sm text-foreground-muted">
                      +{characters.length - 6} karakter daha
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <HiddenSection icon={EyeOff} message="Karakterler gizli" />
        )}

        {/* Campaigns */}
        {(privacySettings?.showCampaigns || profile.isOwnProfile) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-secondary" />
                Oturumlar
                <Badge variant="outline" size="sm">{allCampaigns.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.isOwnProfile && privacySettings && !privacySettings.showCampaigns && (
                <OwnHiddenBanner message="Oturumlarınız başkaları için gizli" />
              )}
              {allCampaigns.length === 0 ? (
                <p className="text-foreground-muted text-center py-6">Henüz oturum yok</p>
              ) : (
                <div className="space-y-3">
                  {allCampaigns.slice(0, 6).map((camp) => {
                    const isCreator = campaigns.created.some((c) => c.id === camp.id);
                    return (
                      <Link
                        key={camp.id}
                        href={`/campaigns/${camp.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated hover:bg-background-elevated/80 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{camp.name}</p>
                            {isCreator && (
                              <Crown className="h-3.5 w-3.5 text-warning shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-foreground-muted">
                            {camp.isMultiplayer ? "Çok Oyunculu" : "Solo"}
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(camp.status)} size="sm">
                          {getStatusLabel(camp.status)}
                        </Badge>
                      </Link>
                    );
                  })}
                  {allCampaigns.length > 6 && (
                    <p className="text-center text-sm text-foreground-muted">
                      +{allCampaigns.length - 6} oturum daha
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <HiddenSection icon={EyeOff} message="Oturumlar gizli" />
        )}
      </div>

      {/* Scenarios */}
      {(privacySettings?.showScenarios || profile.isOwnProfile) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scroll className="h-5 w-5 text-accent" />
              Senaryolar
              <Badge variant="outline" size="sm">{scenarios.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.isOwnProfile && privacySettings && !privacySettings.showScenarios && (
              <OwnHiddenBanner message="Senaryolarınız başkaları için gizli" />
            )}
            {scenarios.length === 0 ? (
              <p className="text-foreground-muted text-center py-6">Henüz senaryo yok</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scenarios.slice(0, 6).map((scenario) => (
                  <Link
                    key={scenario.id}
                    href={`/scenarios/${scenario.id}`}
                    className="p-4 rounded-lg bg-background-elevated border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm truncate">{scenario.title}</h4>
                      {scenario.isOfficial && (
                        <Badge variant="primary" size="sm" className="shrink-0">Resmi</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" size="sm">{scenario.genre}</Badge>
                      <Badge
                        variant={
                          scenario.difficulty === "Easy" ? "success" :
                          scenario.difficulty === "Hard" ? "danger" : "warning"
                        }
                        size="sm"
                      >
                        {scenario.difficulty === "Easy" ? "Kolay" :
                         scenario.difficulty === "Hard" ? "Zor" : "Orta"}
                      </Badge>
                    </div>
                    {scenario.tags && scenario.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scenario.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-foreground-muted">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            {scenarios.length > 6 && (
              <p className="text-center text-sm text-foreground-muted mt-3">
                +{scenarios.length - 6} senaryo daha
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <HiddenSection icon={EyeOff} message="Senaryolar gizli" />
      )}
    </div>
  );
}

// Gizli bölüm mesajı
function HiddenSection({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-3 text-foreground-muted">
          <Icon className="h-5 w-5" />
          <p className="text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Kendi profildeki gizli bölüm uyarı banner'ı
function OwnHiddenBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
      <EyeOff className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
