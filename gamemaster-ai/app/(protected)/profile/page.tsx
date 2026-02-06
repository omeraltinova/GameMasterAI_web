"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Avatar,
  Badge,
  useToast, // Toast yerine useToast import ettik
  ConfirmDialog,
  ThemeSelector,
} from "@/components/ui";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { themeConfig, type ThemeColor } from "@/components/providers/ThemeProvider";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Save,
  Lock,
  Palette,
  Check,
  Eye,
  EyeOff,
  Globe,
  Swords,
  Scroll,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { addToast } = useToast(); // Hook'u başlattık
  const user = session?.user;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showCharacters: true,
    showCampaigns: true,
    showScenarios: true,
    showStats: true,
  });
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Session yüklendiğinde formu doldur
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

  // Gizlilik ayarlarını yükle
  useEffect(() => {
    const loadPrivacy = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setPrivacy({
              profilePublic: data.user.profilePublic ?? true,
              showCharacters: data.user.showCharacters ?? true,
              showCampaigns: data.user.showCampaigns ?? true,
              showScenarios: data.user.showScenarios ?? true,
              showStats: data.user.showStats ?? true,
            });
          }
        }
      } catch { /* ignore */ }
      setPrivacyLoaded(true);
    };
    loadPrivacy();
  }, []);

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
        body: JSON.stringify({ name: formData.name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Güncelleme başarısız");
      }

      // Session'ı güncelle (arayüzdeki ismin hemen değişmesi için)
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast("Lutfen tum sifre alanlarini doldurun.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Yeni sifreler eslesmiyor.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Sifre degistirme basarisiz");
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Sifre basariyla guncellendi", "success");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsChangingPassword(false);
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
      const res = await fetch("/api/profile", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hesap silinemedi");
      }

      // Çıkış yap ve anasayfaya yönlendir
      await signOut({ callbackUrl: "/" });
    } catch (error: any) {
      showToast(error.message, "error");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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

    const themes = Object.entries(themeConfig) as [ThemeColor, typeof themeConfig[ThemeColor]][];
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
                  : "border-border hover:border-border-hover bg-background-tertiary"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "ring-2 ring-offset-2 ring-offset-background-elevated",
                    theme === key ? "ring-primary" : "ring-transparent"
                  )}
                  style={{ backgroundColor: config.color }}
                >
                  {theme === key && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  theme === key ? "text-primary" : "text-foreground-secondary"
                )}>
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Toast componenti buradan kaldırıldı çünkü ToastProvider global olarak yönetecek */}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="text-foreground-secondary">Hesap ayarlarını yönet</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              src={user.image || undefined}
              fallback={user.name || "U"}
              size="xl"
              className="w-24 h-24"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-foreground-secondary">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant={user.role === "ADMIN" ? "danger" : "primary"}>
                  {user.role === "ADMIN" ? "YÖNETİCİ" : "ÜYE"}
                </Badge>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Aktif Hesap
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Fotoğraf Değiştir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" isLoading={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              Değişiklikleri Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Güvenlik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handlePasswordChange} className="space-y-4 p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium mb-1">Sifre Degistir</h4>
              <p className="text-sm text-foreground-muted">
                Mevcut sifren ile yeni sifreni dogrula
              </p>
            </div>
            <Input
              label="Mevcut Sifre"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Mevcut sifren"
            />
            <Input
              label="Yeni Sifre"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Yeni sifre"
            />
            <Input
              label="Yeni Sifre (Tekrar)"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Yeni sifreyi tekrar gir"
            />
            <Button type="submit" isLoading={isChangingPassword} className="gap-2">
              <Save className="h-4 w-4" />
              Sifreyi Guncelle
            </Button>
          </form>

          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">Iki Faktorlu Dogrulama</h4>
              <p className="text-sm text-foreground-muted">
                Girislerde ek guvenlik katmani
              </p>
            </div>
            <Badge variant="outline">Yakinda</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Profil Gizliliği
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!privacyLoaded ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground-muted">
                Profilinin diğer oyunculara nasıl göründüğünü kontrol et.
              </p>

              {/* Ana toggle: Profil herkese açık mı */}
              <PrivacyToggle
                icon={Globe}
                label="Profil Herkese Açık"
                description="Kapatırsan profilin sadece sana görünür"
                checked={privacy.profilePublic}
                onChange={(v) => setPrivacy((p) => ({ ...p, profilePublic: v }))}
              />

              <div className={cn(
                "space-y-3 pl-4 border-l-2 border-border transition-opacity",
                !privacy.profilePublic && "opacity-40 pointer-events-none"
              )}>
                <PrivacyToggle
                  icon={Users}
                  label="Karakterleri Göster"
                  description="Karakter listenin profilinde gözükmesi"
                  checked={privacy.showCharacters}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showCharacters: v }))}
                />
                <PrivacyToggle
                  icon={Swords}
                  label="Oturumları Göster"
                  description="Oturum listenin profilinde gözükmesi"
                  checked={privacy.showCampaigns}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showCampaigns: v }))}
                />
                <PrivacyToggle
                  icon={Scroll}
                  label="Senaryoları Göster"
                  description="Oluşturduğun senaryoların profilinde gözükmesi"
                  checked={privacy.showScenarios}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showScenarios: v }))}
                />
                <PrivacyToggle
                  icon={BarChart3}
                  label="İstatistikleri Göster"
                  description="Zar, mesaj ve başarım istatistiklerinin gözükmesi"
                  checked={privacy.showStats}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showStats: v }))}
                />
              </div>

              <Button
                onClick={handlePrivacySave}
                isLoading={isSavingPrivacy}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Gizlilik Ayarlarını Kaydet
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Tercihler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemePreference />
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">Dil</h4>
              <p className="text-sm text-foreground-muted">Tercih edilen dil</p>
            </div>
            <Badge variant="outline">Türkçe</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card variant="outline" className="border-danger/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-danger">
            <Shield className="h-5 w-5" />
            Tehlikeli Bölge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-danger/10">
            <div>
              <h4 className="font-medium">Çıkış Yap</h4>
              <p className="text-sm text-foreground-muted">
                Bu cihazdan çıkış yap
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Çıkış Yap
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-danger/10">
            <div>
              <h4 className="font-medium text-danger">Hesabı Sil</h4>
              <p className="text-sm text-foreground-muted">
                Hesabını ve tüm verilerini kalıcı olarak sil
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Hesabı Sil
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}

// Toggle bileşeni
function PrivacyToggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-foreground-secondary shrink-0" />
        <div>
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-foreground-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-primary" : "bg-foreground-muted/30"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
