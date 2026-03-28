"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  Activity,
  User,
  Swords,
  Users,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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

interface ActivityFeedProps {
  activities: ActivityItem[];
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Bugün";
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  const years = Math.floor(months / 12);
  return `${years} yıldan fazla`;
}

const activityConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  character_created: { icon: User, color: "text-primary", bg: "bg-primary/10" },
  campaign_created: { icon: Swords, color: "text-secondary", bg: "bg-secondary/10" },
  campaign_joined: { icon: Users, color: "text-accent", bg: "bg-accent/10" },
  achievement_unlocked: { icon: Trophy, color: "text-warning", bg: "bg-warning/10" },
  session_activity: { icon: MessageSquare, color: "text-info", bg: "bg-info/10" },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Son Aktiviteler
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 8).map((item, idx) => {
            const config = activityConfig[item.type] || activityConfig.session_activity;
            const Icon = config.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    config.bg
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.label}:{" "}
                    <span className="text-foreground-secondary">
                      {item.entityName}
                    </span>
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(item.date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-xs text-foreground-muted/60 shrink-0">
                  {timeAgo(item.date)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
