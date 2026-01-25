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
} from "@/components/ui";
import { useSession, signOut } from "next-auth/react";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Save,
  Lock,
  Palette,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Manuel toast state'ine gerek kalmadı, useToast halledecek

  // Session yüklendiğinde formu doldur
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

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

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Tercihler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">Tema</h4>
              <p className="text-sm text-foreground-muted">Arayüz görünümü</p>
            </div>
            <Badge variant="primary">Karanlık</Badge>
          </div>
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
        description="Bu işlem geri alınamaz. Tüm karakterleriniz, kampanyalarınız ve verileriniz kalıcı olarak silinecektir."
        confirmText="Evet, Hesabı Sil"
        cancelText="İptal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
