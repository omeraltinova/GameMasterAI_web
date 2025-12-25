"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Avatar, Badge } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { User, Mail, Calendar, Shield, Save, Lock, Bell, Palette } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Saving profile:", formData);
    setIsSaving(false);
  };

  const roleLabels = {
    VISITOR: "Ziyaretçi",
    MEMBER: "Üye",
    ADMIN: "Admin",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="text-foreground-secondary">
          Hesap ayarlarını yönet
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar
              src={user?.avatar}
              fallback={user?.username}
              size="xl"
              className="w-24 h-24"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{user?.username}</h2>
              <p className="text-foreground-secondary">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="primary">
                  {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
                </Badge>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  {user?.createdAt ? formatDate(user.createdAt) : "Bugün"} tarihinden beri
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm">
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
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="E-posta"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              leftIcon={<Mail className="h-4 w-4" />}
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
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">Şifre</h4>
              <p className="text-sm text-foreground-muted">
                Son değişiklik: Bilinmiyor
              </p>
            </div>
            <Button variant="outline" size="sm">
              Değiştir
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">İki Faktörlü Doğrulama</h4>
              <p className="text-sm text-foreground-muted">
                Hesabını daha güvenli hale getir
              </p>
            </div>
            <Badge variant="outline">Yakında</Badge>
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
              <p className="text-sm text-foreground-muted">
                Arayüz görünümü
              </p>
            </div>
            <Badge variant="primary">Karanlık</Badge>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
            <div>
              <h4 className="font-medium">Dil</h4>
              <p className="text-sm text-foreground-muted">
                Tercih edilen dil
              </p>
            </div>
            <Badge variant="outline">Türkçe</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Bildirimler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "E-posta Bildirimleri", desc: "Kampanya güncellemeleri", enabled: true },
            { label: "Oyun Bildirimleri", desc: "Sıran geldiğinde bildir", enabled: true },
            { label: "Pazarlama", desc: "Yenilikler ve özel teklifler", enabled: false },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-lg bg-background-elevated"
            >
              <div>
                <h4 className="font-medium">{item.label}</h4>
                <p className="text-sm text-foreground-muted">{item.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={item.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
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
            <Button variant="danger" size="sm" onClick={logout}>
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
            <Button variant="danger" size="sm">
              Hesabı Sil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


