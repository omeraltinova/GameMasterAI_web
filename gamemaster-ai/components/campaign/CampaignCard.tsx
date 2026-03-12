import Link from "next/link";
import { Card, CardContent, Badge } from "@/components/ui";
import type { Campaign } from "@/types";
import { Users, Calendar, Play, Pause, CheckCircle, FileEdit, User } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

type CampaignWithCreator = Campaign & {
  creator?: {
    username?: string | null;
  };
};

interface CampaignCardProps {
  campaign: CampaignWithCreator;
}

const statusConfig = {
  DRAFT: { label: "Taslak", variant: "default" as const, icon: FileEdit },
  ACTIVE: { label: "Aktif", variant: "success" as const, icon: Play },
  PAUSED: { label: "Duraklatıldı", variant: "warning" as const, icon: Pause },
  COMPLETED: { label: "Tamamlandı", variant: "secondary" as const, icon: CheckCircle },
};

const headerTheme = {
  DRAFT: "from-slate-600/40 via-zinc-600/25 to-slate-700/40",
  ACTIVE: "from-emerald-600/35 via-teal-600/25 to-cyan-700/35",
  PAUSED: "from-amber-600/35 via-orange-600/25 to-amber-700/35",
  COMPLETED: "from-indigo-600/35 via-violet-600/25 to-fuchsia-700/35",
} as const;

export function CampaignCard({ campaign }: CampaignCardProps) {
  const status = statusConfig[campaign.status];
  const StatusIcon = status.icon;
  const seed = campaign.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const motifX = 18 + (seed % 40);
  const motifY = 20 + (seed % 30);

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card hover className="h-full group">
        {/* Header with gradient */}
        <div
          className={cn(
            "relative h-24 overflow-hidden rounded-t-xl bg-gradient-to-br",
            headerTheme[campaign.status]
          )}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(circle at ${motifX}% ${motifY}%, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.05) 26%, transparent 56%), radial-gradient(circle at 82% 18%, rgba(255,255,255,0.18) 0, transparent 52%)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <StatusIcon className="h-5 w-5 text-white/90" />
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          {campaign.isMultiplayer && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="outline" size="sm">
                Çok Oyunculu
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="pt-4">
          {/* Title */}
          <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
            {campaign.name}
          </h3>

          {/* Description */}
          {campaign.description && (
            <p className="text-sm text-foreground-secondary line-clamp-2 mb-4">
              {campaign.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            {campaign.isMultiplayer ? (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {campaign.playerCount || 0}/{campaign.maxPlayers}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Solo</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatRelativeTime(campaign.updatedAt)}</span>
            </div>
          </div>

          {campaign.creator?.username && (
            <div className="mt-3 flex items-center gap-1 text-xs text-foreground-muted">
              <User className="h-3 w-3" />
              <span>Oluşturan: {campaign.creator.username}</span>
            </div>
          )}

          {/* Invite Code (if exists) */}
          {campaign.isMultiplayer && campaign.inviteCode && campaign.status === "ACTIVE" && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-muted">Davet Kodu</span>
                <code className="text-xs px-2 py-1 rounded bg-background-elevated font-mono">
                  {campaign.inviteCode}
                </code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
