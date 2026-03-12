"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Avatar,
  Badge,
  useToast,
  ConfirmDialog,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  Textarea,
} from "@/components/ui";
import { ProfileSidebar, SecurityTab, PrivacyTab, AchievementsSection, ActivityFeed } from "@/components/profile";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  themeConfig,
  type ThemeColor,
} from "@/components/providers/ThemeProvider";
import {
  User,
  Mail,
  Shield,
  Save,
  Lock,
  Palette,
  Check,
  Eye,
  EyeOff,
  Swords,
  Scroll,
  Users,
  Trophy,
  Star,
  Dices,
  MessageSquare,
  Compass,
  Flame,
  Skull,
  Zap,
  BookOpen,
  Drama,
  HandMetal,
  Footprints,
  CalendarDays,
  Gamepad2,
  Gem,
  Mountain,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCategory,
} from "@/lib/achievements";

// icon adı -> Lucide bileşeni eşlemesi
const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, CalendarDays, Eye, User, Users, Gamepad2, Trophy, Star,
  Dices, Sparkles, Zap, Skull, Flame, MessageSquare, BookOpen, Drama, Swords,
  HandMetal, Scroll, Compass, Shield, Gem, Mountain, Target,
};

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
}

interface ActivityItem {
  type:
    | "character_created"
    | "campaign_created"
    | "campaign_joined"
    | "achievement_unlocked"
    | "session_activity";
  label: string;
  entityName: string;
  date: string;
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

interface ApiAchievement {
  id: string;
  unlocked?: boolean;
  unlockedAt: string | null;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  const user = session?.user;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showCharacters: true,
    showCampaigns: true,
    showScenarios: true,
    showStats: true,
  });
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Yeni state'ler
  const [bio, setBio] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [apiAchievements, setApiAchievements] = useState<ApiAchievement[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Session yüklendiğinde formu doldur
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

  // Profil verilerini yükle
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setProfileData(data.user);
            setBio(data.user.bio || "");
            setPrivacy({
              profilePublic: data.user.profilePublic ?? true,
              showCharacters: data.user.showCharacters ?? true,
              showCampaigns: data.user.showCampaigns ?? true,
              showScenarios: data.user.showScenarios ?? true,
              showStats: data.user.showStats ?? true,
            });
            if (data.stats) setStats(data.stats);
            if (data.achievements) setApiAchievements(data.achievements);
            if (data.recentActivity) setRecentActivity(data.recentActivity);
          }
        }
      } catch {
        /* ignore */
      }
      setPrivacyLoaded(true);
    };
    loadProfile();
  }, []);

  // Başarım tanımlarını API verisiyle birleştir
  const finalAchievements: Achievement[] = useMemo(() => {
    if (apiAchievements.length === 0) return [];

    const apiMap = new Map(
      apiAchievements.map((a) => [a.id, a])
    );

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const fromApi = apiMap.get(def.id);
      const unlocked =
        fromApi?.unlocked ??
        (fromApi?.unlockedAt !== null && fromApi?.unlockedAt !== undefined);

      return {
        id: def.id,
        label: def.label,
        description: def.description,
        icon: ICON_MAP[def.iconName] || Star,
        color: def.color,
        category: def.category,
        unlocked,
        unlockedAt: fromApi?.unlockedAt ?? null,
      };
    });
  }, [apiAchievements]);

  const unlockedAchievements = finalAchievements.filter((a) => a.unlocked);

  // Profil tamamlama yüzdesi
  const profileCompletion = useMemo(() => {
    const criteria = [
      { label: "Avatar yükle", done: !!user?.image },
      { label: "Biyografi yaz", done: bio.trim().length > 0 },
      { label: "Karakter oluştur", done: (stats?.totalCharacters ?? profileData?._count?.characters ?? 0) > 0 },
      { label: "Oturum başlat", done: (stats?.totalCampaignsCreated ?? profileData?._count?.campaigns ?? 0) > 0 },
      { label: "Başarım kazan", done: unlockedAchievements.length > 0 },
    ];
    const doneCount = criteria.filter((c) => c.done).length;
    return {
      percentage: Math.round((doneCount / criteria.length) * 100),
      criteria,
      missing: criteria.filter((c) => !c.done),
    };
  }, [user, bio, stats, profileData, unlockedAchievements]);

  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      type: type,
      title: type === "success" ? "İşlem Başarılı" : "Hata",
      description: message,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, bio }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Güncelleme başarısız");
      }

      await update({
        ...session,
        user: { ...session?.user, name: formData.name },
      });

      showToast("Profil başarıyla güncellendi", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacySave = async () => {
    setIsSavingPrivacy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncelleme başarısız");
      showToast("Gizlilik ayarları kaydedildi", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const currentPassword = window.prompt("Hesabınızı silmek için mevcut şifrenizi girin:");
      if (!currentPassword) {
        throw new Error("Hesap silme için şifre girmelisiniz.");
      }

      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hesap silinemedi");
      }

      await signOut({ callbackUrl: "/" });
    } catch (error: any) {
      showToast(error.message, "error");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAvatarChange = async (imageData: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Avatar güncellenemedi");
      await update({
        ...session,
        user: { ...session?.user, image: imageData },
      });
      showToast("Profil fotoğrafı güncellendi", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handlePasswordFromTab = async (form: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      showToast("Lütfen tüm şifre alanlarını doldurun.", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showToast("Yeni şifreler eşleşmiyor.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Şifre değiştirme başarısız");
      showToast("Şifre başarıyla güncellendi", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  // Theme Preference Component
  const ThemePreference = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return (
        <div className="p-4 rounded-lg bg-background-elevated">
          <div className="animate-pulse h-20 bg-background-tertiary rounded" />
        </div>
      );
    }

    const themes = Object.entries(themeConfig) as [
      ThemeColor,
      (typeof themeConfig)[ThemeColor],
    ][];
    const currentTheme = themeConfig[theme as ThemeColor] || themeConfig.arcane;

    return (
      <div className="p-4 rounded-lg bg-background-elevated space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Tema</h4>
            <p className="text-sm text-foreground-muted">Arayüz renk teması</p>
          </div>
          <Badge variant="primary">{currentTheme.label}</Badge>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {themes.map(([key, config]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                "p-3 sm:p-4 rounded-lg border-2 transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                theme === key
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-border-hover bg-background-tertiary",
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "ring-2 ring-offset-2 ring-offset-background-elevated",
                    theme === key ? "ring-primary" : "ring-transparent",
                  )}
                  style={{ backgroundColor: config.color }}
                >
                  {theme === key && <Check className="h-4 w-4 text-white" />}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    theme === key
                      ? "text-primary"
                      : "text-foreground-secondary",
                  )}
                >
                  {config.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto animate-fade-in pb-10 md:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="text-foreground-secondary">Hesap ayarlarını yönet</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-12rem)] md:h-[calc(100vh-12rem)]">
        {/* Sol Panel: Profil Özeti + Banner */}
        <ProfileSidebar
          user={user}
          bio={bio}
          stats={stats}
          profileData={profileData}
          profileCompletion={profileCompletion}
          onAvatarChange={handleAvatarChange}
        />

        {/* Sağ Panel: Sekmeler */}
        <div className="flex-1 flex flex-col h-full rounded-xl border border-border bg-background-secondary/20 p-4 md:p-6 shadow-sm overflow-hidden min-h-[500px]">
          <Tabs
            defaultValue="general"
            className="flex flex-col h-full overflow-hidden"
          >
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto gap-2 bg-transparent p-0 mb-6 flex-shrink-0">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-background data-[state=active]:shadow-md py-2 overflow-hidden text-ellipsis px-1 sm:px-3"
              >
                <User className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Genel</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-background data-[state=active]:shadow-md py-2 overflow-hidden text-ellipsis px-1 sm:px-3"
              >
                <Shield className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Güvenlik</span>
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="data-[state=active]:bg-background data-[state=active]:shadow-md py-2 overflow-hidden text-ellipsis px-1 sm:px-3"
              >
                <Eye className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Gizlilik</span>
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="data-[state=active]:bg-background data-[state=active]:shadow-md py-2 overflow-hidden text-ellipsis px-1 sm:px-3"
              >
                <Palette className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Tercihler</span>
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="col-span-2 md:col-span-1 data-[state=active]:bg-danger/10 data-[state=active]:text-danger py-2 overflow-hidden text-ellipsis px-1 sm:px-3 hover:bg-danger/5 transition-colors"
              >
                <Lock className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Tehlike</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <TabsContent value="general" className="mt-0 h-full">
                <Card className="border-none shadow-none bg-transparent">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Profil Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <form onSubmit={handleSave} className="space-y-4">
                      <Input
                        label="Kullanıcı Adı"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        leftIcon={<User className="h-4 w-4" />}
                        placeholder="Kullanıcı adınız"
                      />
                      <Input
                        label="E-posta"
                        type="email"
                        value={formData.email}
                        readOnly
                        className="opacity-70 cursor-not-allowed"
                        leftIcon={<Mail className="h-4 w-4" />}
                        hint="E-posta adresi değiştirilemez."
                      />

                      {/* Feature 6: Biyografi alanı */}
                      <div>
                        <Textarea
                          label="Biyografi"
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 500))}
                          placeholder="Kendinizden kısaca bahsedin..."
                          rows={3}
                          hint={`${bio.length}/500`}
                        />
                      </div>

                      <Button
                        type="submit"
                        isLoading={isSaving}
                        className="gap-2 mt-2"
                      >
                        <Save className="h-4 w-4" />
                        Değişiklikleri Kaydet
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-0 h-full">
                <SecurityTab
                  onPasswordChange={handlePasswordFromTab}
                  isChangingPassword={isChangingPassword}
                />
              </TabsContent>

              <TabsContent value="privacy" className="mt-0 h-full">
                <PrivacyTab
                  privacy={privacy}
                  privacyLoaded={privacyLoaded}
                  isSavingPrivacy={isSavingPrivacy}
                  onPrivacyChange={setPrivacy}
                  onSave={handlePrivacySave}
                  onPreview={() => setShowPreviewModal(true)}
                />
              </TabsContent>

              <TabsContent value="preferences" className="mt-0 h-full">
                <Card className="border-none shadow-none bg-transparent">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      Tercihler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <ThemePreference />
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-background-elevated border border-border/50 gap-4">
                      <div className="text-center sm:text-left">
                        <h4 className="font-semibold text-lg mb-1">Dil</h4>
                        <p className="text-sm text-foreground-muted">
                          Tercih edilen arayüz dili
                        </p>
                      </div>
                      <Badge variant="outline" className="px-4 py-1.5 shrink-0">
                        Türkçe
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="danger" className="mt-0 h-full">
                <Card className="border border-danger/30 shadow-sm bg-danger/5 xl:h-auto">
                  <CardHeader className="pb-4 border-b border-danger/10">
                    <CardTitle className="flex items-center gap-2 text-danger">
                      <Shield className="h-5 w-5" />
                      Tehlikeli Bölge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-background-elevated/50 border border-danger/20 gap-4">
                      <div className="text-center sm:text-left">
                        <h4 className="font-semibold text-lg mb-1">Çıkış Yap</h4>
                        <p className="text-sm text-foreground-muted">
                          Bu cihazdan güvenli bir şekilde çıkış yap
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        Oturumu Kapat
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-danger/10 border border-danger/30 gap-4">
                      <div className="text-center sm:text-left">
                        <h4 className="font-semibold text-lg text-danger mb-1">
                          Hesabı Sil
                        </h4>
                        <p className="text-sm text-foreground-muted">
                          Hesabını ve tüm verilerini kalıcı olarak sil
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Hesabı Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Başarım Rozetleri */}
      <AchievementsSection
        achievements={finalAchievements}
        unlockedAchievements={unlockedAchievements}
      />

      {/* Aktivite Akışı */}
      <ActivityFeed activities={recentActivity} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Hesabınızı silmek istediğinize emin misiniz?"
        description="Bu işlem geri alınamaz. Tüm karakterleriniz, oturumlarınız ve verileriniz kalıcı olarak silinecektir."
        confirmText="Evet, Hesabı Sil"
        cancelText="İptal"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Feature 7: Herkese Açık Profil Önizlemesi */}
      <Modal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        title="Herkese Açık Profil Önizlemesi"
        size="xl"
      >
        <div className="space-y-6">
          {!privacy.profilePublic ? (
            <div className="flex flex-col items-center text-center space-y-3 py-8">
              <Lock className="h-12 w-12 text-foreground-muted" />
              <h3 className="text-lg font-semibold">Bu profil gizli</h3>
              <p className="text-foreground-muted max-w-md">
                Profiliniz gizli olarak ayarlanmış. Diğer oyuncular karakter, oturum ve istatistik bilgilerinizi görüntüleyemiyor.
              </p>
            </div>
          ) : (
            <>
              {/* Profil bilgileri */}
              <div className="flex items-center gap-4">
                <Avatar
                  src={user.image || undefined}
                  fallback={user.name || "U"}
                  size="lg"
                />
                <div>
                  <h3 className="text-xl font-bold">{user.name}</h3>
                  {bio.trim() && (
                    <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{bio}</p>
                  )}
                </div>
              </div>

              {/* Gizlilik durumlarına göre bölümler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PreviewSection
                  label="İstatistikler"
                  visible={privacy.showStats}
                  value={stats ? `${stats.totalCharacters} karakter, ${stats.totalDiceRolls} zar atışı` : undefined}
                />
                <PreviewSection
                  label="Karakterler"
                  visible={privacy.showCharacters}
                  value={stats ? `${stats.totalCharacters} karakter` : undefined}
                />
                <PreviewSection
                  label="Oturumlar"
                  visible={privacy.showCampaigns}
                  value={stats ? `${stats.totalCampaignsCreated + stats.totalCampaignsJoined} oturum` : undefined}
                />
                <PreviewSection
                  label="Senaryolar"
                  visible={privacy.showScenarios}
                  value={stats ? `${stats.totalScenarios} senaryo` : undefined}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Önizleme bölüm kartı
function PreviewSection({
  label,
  visible,
  value,
}: {
  label: string;
  visible: boolean;
  value?: string;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      visible ? "bg-background-elevated border-border" : "bg-background-secondary/30 border-border/50"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {visible ? (
          <Badge variant="success" size="sm" className="gap-1">
            <Eye className="h-3 w-3" />
            Görünür
          </Badge>
        ) : (
          <Badge variant="outline" size="sm" className="gap-1 text-foreground-muted">
            <EyeOff className="h-3 w-3" />
            Gizli
          </Badge>
        )}
      </div>
      {visible && value && (
        <p className="text-xs text-foreground-muted mt-2">{value}</p>
      )}
    </div>
  );
}
