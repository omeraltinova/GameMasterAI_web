import Link from "next/link";
import { Card, CardContent, Badge } from "@/components/ui";
import type { Campaign } from "@/types";
import { Users, Calendar, Play, Pause, CheckCircle, FileEdit } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
}

const statusConfig = {
  DRAFT: { label: "Taslak", variant: "default" as const, icon: FileEdit },
  ACTIVE: { label: "Aktif", variant: "success" as const, icon: Play },
  PAUSED: { label: "Duraklatıldı", variant: "warning" as const, icon: Pause },
  COMPLETED: { label: "Tamamlandı", variant: "secondary" as const, icon: CheckCircle },
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const status = statusConfig[campaign.status];
  const StatusIcon = status.icon;

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card hover className="h-full group">
        {/* Header with gradient */}
        <div className="relative h-24 bg-gradient-to-br from-secondary/30 via-primary/20 to-secondary/30 rounded-t-xl">
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
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {campaign.playerCount || 0}/{campaign.maxPlayers}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatRelativeTime(campaign.updatedAt)}</span>
            </div>
          </div>

          {/* Invite Code (if exists) */}
          {campaign.inviteCode && campaign.status === "ACTIVE" && (
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


