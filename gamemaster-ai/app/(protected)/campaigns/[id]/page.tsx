"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar } from "@/components/ui";
import { mockCampaigns, mockCampaignPlayers, mockScenarios, mockCharacters } from "@/lib/mock-data";
import {
  ArrowLeft,
  Play,
  Settings,
  Copy,
  Users,
  Check,
  Swords,
  Map,
  Clock,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

export default function CampaignLobbyPage() {
  const params = useParams();
  const [codeCopied, setCodeCopied] = useState(false);

  const campaign = mockCampaigns.find((c) => c.id === params.id);
  const scenario = campaign?.scenarioId
    ? mockScenarios.find((s) => s.id === campaign.scenarioId)
    : null;
  const players = mockCampaignPlayers.filter((p) => p.campaignId === params.id);

  // Get user's available characters for this campaign
  const availableCharacters = mockCharacters.filter(
    (c) => c.userId === "user_1" && !c.campaignId
  );

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Kampanyalara Dön</Button>
        </Link>
      </div>
    );
  }

  const handleCopyCode = () => {
    if (campaign.inviteCode) {
      navigator.clipboard.writeText(campaign.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const statusColors = {
    DRAFT: "default",
    ACTIVE: "success",
    PAUSED: "warning",
    COMPLETED: "secondary",
  } as const;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/campaigns">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kampanyalara Dön
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge variant={statusColors[campaign.status]}>{campaign.status}</Badge>
          </div>
          {campaign.description && (
            <p className="text-foreground-secondary max-w-2xl">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/campaigns/${campaign.id}/settings`}>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Ayarlar
            </Button>
          </Link>
          {campaign.status === "ACTIVE" && (
            <Link href={`/campaigns/${campaign.id}/play`}>
              <Button className="gap-2">
                <Play className="h-4 w-4" />
                Oyuna Başla
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Info */}
          {scenario && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Senaryo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                    <Swords className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{scenario.title}</h3>
                      {scenario.isOfficial && (
                        <Badge variant="primary" size="sm">
                          Resmi
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground-secondary mb-3">
                      {scenario.description}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{scenario.genre}</Badge>
                      <Badge variant="outline">{scenario.difficulty}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Oyuncular ({players.length}/{campaign.maxPlayers})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-background-elevated"
                  >
                    <Avatar
                      src={player.user?.avatar}
                      fallback={player.user?.username}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{player.user?.username}</h4>
                        {player.userId === campaign.creatorId && (
                          <Badge variant="primary" size="sm">
                            Kurucu
                          </Badge>
                        )}
                      </div>
                      {player.character && (
                        <p className="text-sm text-foreground-secondary">
                          {player.character.name} - Lv.{player.character.level}{" "}
                          {player.character.race} {player.character.class}
                        </p>
                      )}
                    </div>
                    <Badge variant={player.isActive ? "success" : "default"}>
                      {player.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                ))}

                {players.length < campaign.maxPlayers && (
                  <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border text-foreground-muted">
                    <UserPlus className="h-5 w-5" />
                    <span>Oyuncu bekleniyor...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invite Code */}
          {campaign.inviteCode && campaign.isMultiplayer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Davet Kodu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-lg bg-background-elevated font-mono text-lg text-center">
                    {campaign.inviteCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {codeCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-foreground-muted mt-2 text-center">
                  Bu kodu arkadaşlarınla paylaşarak onları kampanyaya davet
                  edebilirsin.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Mod</span>
                <Badge variant="outline">
                  {campaign.isMultiplayer ? "Çok Oyunculu" : "Solo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Oluşturulma</span>
                <span>{formatDate(campaign.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Son Güncelleme</span>
                <span>{formatDate(campaign.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Character Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Karakterin</CardTitle>
            </CardHeader>
            <CardContent>
              {availableCharacters.length > 0 ? (
                <div className="space-y-2">
                  {availableCharacters.slice(0, 3).map((char) => (
                    <button
                      key={char.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all text-left"
                    >
                      <Avatar fallback={char.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{char.name}</p>
                        <p className="text-xs text-foreground-muted">
                          Lv.{char.level} {char.class}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground-secondary mb-3">
                    Kullanılabilir karakterin yok
                  </p>
                  <Link href="/characters/new">
                    <Button size="sm" variant="outline">
                      Karakter Oluştur
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


