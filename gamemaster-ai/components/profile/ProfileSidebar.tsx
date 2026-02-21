"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Avatar,
  Badge,
  Button,
  Progress,
} from "@/components/ui";
import {
  User,
  Swords,
  Scroll,
  Dices,
  MessageSquare,
  Check,
  Camera,
  Sparkles,
  Loader2,
} from "lucide-react";

interface StatsData {
  totalCharacters: number;
  totalCampaignsCreated: number;
  totalCampaignsJoined: number;
  totalMessages: number;
  totalDiceRolls: number;
  totalScenarios: number;
  [key: string]: any;
}

interface ProfileSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  bio: string;
  stats: StatsData | null;
  profileData: any;
  profileCompletion: {
    percentage: number;
    missing: { label: string; done: boolean }[];
  };
  onAvatarChange: (imageData: string) => void;
}

export function ProfileSidebar({
  user,
  bio,
  stats,
  profileData,
  profileCompletion,
  onAvatarChange,
}: ProfileSidebarProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // Max 2MB

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onAvatarChange(base64);
      setIsUploadingAvatar(false);
    };
    reader.onerror = () => {
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full md:w-80 flex flex-col shrink-0 h-full">
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Profile Banner */}
        <div className="relative h-28 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, var(--color-primary) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--color-secondary) 1px, transparent 1px), radial-gradient(circle at 60% 80%, var(--color-accent) 1px, transparent 1px)",
              backgroundSize: "40px 40px, 60px 60px, 50px 50px",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </div>

        <CardContent className="p-6 flex flex-col items-center flex-1 relative -mt-16">
          {/* Avatar with upload */}
          <div className="relative group mb-4">
            <Avatar
              src={user.image || undefined}
              fallback={user.name || "U"}
              size="xl"
              className="w-32 h-32 shadow-xl ring-4 ring-card"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {isUploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploadingAvatar}
              />
            </label>
          </div>

          <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
          <p className="text-foreground-secondary text-sm mb-3">
            {user.email}
          </p>

          {/* Bio preview */}
          {bio.trim() ? (
            <p className="text-sm text-foreground-muted text-center line-clamp-3 mb-4 px-2">
              {bio}
            </p>
          ) : (
            <p className="text-sm text-foreground-muted/50 text-center italic mb-4">
              Henüz biyografi eklenmemiş
            </p>
          )}

          {/* Profile Completion */}
          {profileCompletion.percentage < 100 ? (
            <div className="w-full mb-4 p-3 rounded-lg bg-background-elevated/50 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground-muted">
                  Profil Tamamlama
                </span>
                <span className="text-xs font-bold text-primary">
                  %{profileCompletion.percentage}
                </span>
              </div>
              <Progress
                value={profileCompletion.percentage}
                className="h-2 mb-2"
              />
              <div className="space-y-1">
                {profileCompletion.missing.map((item) => (
                  <p
                    key={item.label}
                    className="text-[11px] text-foreground-muted/70 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-foreground-muted/40 shrink-0" />
                    {item.label}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full mb-4 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-success/20">
                <Sparkles className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-success">Profil Tamamlandı!</p>
                <p className="text-[11px] text-foreground-muted">Tüm adımları tamamladın</p>
              </div>
            </div>
          )}

          <div className="flex flex-col w-full gap-3 mt-auto">
            {profileData && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-background-elevated">
                <span className="text-sm font-medium text-foreground-muted">
                  Katılım
                </span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(profileData.createdAt).toLocaleDateString("tr-TR", {
                    month: "long",
                    year: "numeric",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Stats */}
            {(stats || profileData?._count) && (
              <>
                <div className="grid grid-cols-3 gap-2 w-full mt-2">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-background-elevated/50 border border-border/40">
                    <User className="h-3.5 w-3.5 text-primary mb-1" />
                    <span className="text-lg font-bold text-primary">
                      {stats?.totalCharacters ??
                        profileData?._count?.characters ??
                        0}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Karakter
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-background-elevated/50 border border-border/40">
                    <Swords className="h-3.5 w-3.5 text-secondary mb-1" />
                    <span className="text-lg font-bold text-secondary">
                      {stats
                        ? stats.totalCampaignsCreated +
                          stats.totalCampaignsJoined
                        : profileData?._count?.campaigns ?? 0}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Oturum
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-background-elevated/50 border border-border/40">
                    <Scroll className="h-3.5 w-3.5 text-accent mb-1" />
                    <span className="text-lg font-bold text-accent">
                      {stats?.totalScenarios ??
                        profileData?._count?.scenarios ??
                        0}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Senaryo
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-background-elevated/50 border border-border/40">
                    <Dices className="h-3.5 w-3.5 text-warning mb-1" />
                    <span className="text-lg font-bold text-warning">
                      {stats?.totalDiceRolls ?? 0}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Zar Atışı
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-background-elevated/50 border border-border/40">
                    <MessageSquare className="h-3.5 w-3.5 text-info mb-1" />
                    <span className="text-lg font-bold text-info">
                      {stats?.totalMessages ?? 0}
                    </span>
                    <span className="text-xs text-foreground-muted">Mesaj</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-background-elevated">
              <span className="text-sm font-medium text-foreground-muted">
                Rol
              </span>
              <Badge variant={user.role === "ADMIN" ? "danger" : "primary"}>
                {user.role === "ADMIN" ? "YÖNETİCİ" : "ÜYE"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background-elevated">
              <span className="text-sm font-medium text-foreground-muted">
                Durum
              </span>
              <Badge
                variant="outline"
                className="border-success/50 text-success"
              >
                <Check className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
