"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import {
  Trophy,
  Star,
  Swords,
  MessageSquare,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { AchievementCategory } from "@/lib/achievements";

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

interface AchievementsSectionProps {
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
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

export function AchievementsSection({
  achievements,
  unlockedAchievements,
}: AchievementsSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (achievements.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Başarımlar
            <Badge variant="outline" size="sm">
              {unlockedAchievements.length}/{achievements.length}
            </Badge>
          </CardTitle>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground-secondary hover:text-foreground"
          >
            {showAll ? (
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
        {!showAll ? (
          <div className="space-y-4">
            {unlockedAchievements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {unlockedAchievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className="p-3 rounded-lg border bg-background-elevated border-border-hover text-center transition-all hover:scale-[1.03]"
                      title={
                        achievement.unlockedAt
                          ? `${formatUnlockedDate(achievement.unlockedAt)} tarihinde açıldı`
                          : undefined
                      }
                    >
                      <Icon className={cn("h-6 w-6 mx-auto mb-2", achievement.color)} />
                      <p className="text-sm font-medium">{achievement.label}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {achievement.description}
                      </p>
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
              <p className="text-center text-foreground-muted py-4">
                Henüz açılmış başarım yok
              </p>
            )}
            {achievements.length - unlockedAchievements.length > 0 && (
              <p className="text-center text-sm text-foreground-muted">
                +{achievements.length - unlockedAchievements.length} kilitli
                başarım
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(
              [
                { key: "general", label: "Genel", icon: Star },
                { key: "combat", label: "Savaş & Zar", icon: Swords },
                { key: "social", label: "Sosyal & Hikaye", icon: MessageSquare },
                { key: "exploration", label: "Keşif & Yaratıcılık", icon: Compass },
              ] as const
            ).map(({ key, label, icon: CatIcon }) => {
              const categoryAchievements = achievements.filter(
                (a) => a.category === key
              );
              const categoryUnlocked = categoryAchievements.filter(
                (a) => a.unlocked
              ).length;
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
                          title={
                            achievement.unlockedAt
                              ? `${formatUnlockedDate(achievement.unlockedAt)} tarihinde açıldı`
                              : undefined
                          }
                        >
                          <Icon
                            className={cn(
                              "h-6 w-6 mx-auto mb-2",
                              achievement.unlocked
                                ? achievement.color
                                : "text-foreground-muted"
                            )}
                          />
                          <p className="text-sm font-medium">
                            {achievement.label}
                          </p>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {achievement.description}
                          </p>
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
  );
}
