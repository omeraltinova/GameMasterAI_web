"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Avatar, Progress } from "@/components/ui";
import { useSession } from "next-auth/react";
import {
  Users,
  Swords,
  Map,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Play,
  Loader2,
} from "lucide-react";
import { get } from "@/lib/api/client";

// TİP TANIMLAMALARI (Hataları gidermek için)
type Character = {
  id: string;
  name: string;
  imageUrl?: string;
  level: number;
  race: string;
  class: string;
  hp: number;
  maxHp: number;
  userId: string;
  experience: number;
  stats?: Record<string, number>;
  campaign?: {
    id: string;
    name: string;
    status: string;
  } | null;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  description?: string | null;
  playerCount: number;
  maxPlayers: number;
  isMultiplayer: boolean;
  creatorId: string;
  lastSession?: {
    id: string;
  } | null;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [userCharacters, setUserCharacters] = useState<Character[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [charactersResponse, campaignsResponse] = await Promise.all([
          get<{ success: boolean; characters: Character[] }>("/characters"),
          get<{ success: boolean; campaigns: Campaign[] }>("/campaigns"),
        ]);

        if (!isMounted) return;

        const nextCharacters = charactersResponse?.characters ?? [];
        const nextCampaigns = campaignsResponse?.campaigns ?? [];

        setUserCharacters(nextCharacters);
        setCampaigns(nextCampaigns);

        const sessionIds = nextCampaigns
          .map((campaign) => campaign.lastSession?.id)
          .filter(Boolean) as string[];

        if (sessionIds.length === 0) {
          setTotalMessages(0);
          return;
        }

        const messageCounts = await Promise.all(
          sessionIds.map(async (sessionId) => {
            try {
              const response = await get<{
                success: boolean;
                pagination?: { total: number };
              }>(`/sessions/${sessionId}/messages?limit=1&offset=0`);
              return response?.pagination?.total ?? 0;
            } catch (error) {
              console.error("Mesaj sayısı alınamadı:", error);
              return 0;
            }
          })
        );

        if (!isMounted) return;
        setTotalMessages(messageCounts.reduce((sum, count) => sum + count, 0));
      } catch (error) {
        console.error("Dashboard verisi alınamadı:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE");

  const statCards = [
    {
      title: "Karakterler",
      value: userCharacters.length,
      icon: Users,
      color: "primary",
      href: "/characters",
    },
    {
      title: "Oturumlar",
      value: campaigns.length,
      icon: Swords,
      color: "secondary",
      href: "/campaigns",
    },
    {
      title: "Aktif Oturumlar",
      value: activeCampaigns.length,
      icon: Play,
      color: "success",
      href: "/campaigns",
    },
    {
      title: "Toplam Mesaj",
      value: totalMessages,
      icon: TrendingUp,
      color: "info",
      href: "#",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            Hoş geldin, <span className="text-primary">{user?.name || "Maceracı"}</span>!
          </h1>
          <p className="text-foreground-secondary">
            Bugün ne macerası istiyorsun?
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/characters/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Karakter
            </Button>
          </Link>
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Swords className="h-4 w-4" />
              Yeni Oturum
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={i} href={stat.href}>
              <Card className="hover:border-primary/50 transition-colors h-full cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-secondary mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-primary/10`}>
                      <Icon className={`h-6 w-6 text-primary`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Characters Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Karakterlerin
            </CardTitle>
            <Link href="/characters">
              <Button variant="ghost" size="sm" className="gap-1">
                Tümünü Gör
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-foreground-muted">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
                  Karakterler yükleniyor...
                </div>
              ) : userCharacters.length > 0 ? (
                userCharacters.slice(0, 4).map((character) => (
                  <Link
                    key={character.id}
                    href={`/characters/${character.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-background-elevated transition-colors"
                  >
                    <Avatar
                      src={character.imageUrl}
                      fallback={character.name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{character.name}</h4>
                        <Badge variant="primary" size="sm">Lv.{character.level}</Badge>
                      </div>
                      <p className="text-sm text-foreground-secondary">
                        {character.race} {character.class}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-foreground-muted">HP</span>
                          <span>{character.hp}/{character.maxHp}</span>
                        </div>
                        <Progress
                          value={character.hp}
                          max={character.maxHp}
                          size="sm"
                        />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-foreground-muted mx-auto mb-3" />
                  <p className="text-foreground-secondary mb-4">
                    Henüz karakterin yok
                  </p>
                  <Link href="/characters/new">
                    <Button size="sm">İlk Karakterini Oluştur</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-secondary" />
              Aktif Oturumlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-foreground-muted">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
                Oturumlar yükleniyor...
              </div>
            ) : activeCampaigns.length > 0 ? (
              activeCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block p-4 rounded-lg bg-background-elevated hover:bg-border transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold truncate">{campaign.name}</h4>
                    <Badge variant={campaign.status === "ACTIVE" ? "success" : "default"} size="sm">
                      {campaign.status === "ACTIVE" ? "Aktif" : campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-foreground-secondary line-clamp-2 mb-3">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-foreground-muted">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {campaign.playerCount || 0}/{campaign.maxPlayers}
                    </span>
                    {campaign.isMultiplayer && (
                      <Badge variant="outline" size="sm">Çok Oyunculu</Badge>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center">
                <Swords className="h-10 w-10 text-foreground-muted mx-auto mb-3" />
                <p className="text-foreground-secondary text-sm mb-4">
                  Aktif oturum yok
                </p>
                <Link href="/campaigns/new">
                  <Button size="sm" variant="outline">Oturum Başlat</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı Erişim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/campaigns/join", icon: Users, label: "Oturuma Katıl", desc: "Davet koduyla katıl" },
              { href: "/scenarios", icon: Map, label: "Senaryolar", desc: "Macera senaryolarını keşfet" },
              { href: "/rules", icon: Clock, label: "Kurallar", desc: "D&D 5e kurallarını incele" },
              { href: "/profile", icon: TrendingUp, label: "Profil", desc: "Ayarlarını düzenle" },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={i} href={action.href}>
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group h-full">
                    <Icon className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-medium mb-1">{action.label}</h4>
                    <p className="text-sm text-foreground-secondary">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
