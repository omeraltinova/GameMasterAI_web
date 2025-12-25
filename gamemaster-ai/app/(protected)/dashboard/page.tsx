"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Avatar, Progress } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { mockCharacters, mockCampaigns, mockMessages } from "@/lib/mock-data";
import {
  Users,
  Swords,
  Map,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Play,
} from "lucide-react";

const statCards = [
  {
    title: "Karakterler",
    value: mockCharacters.filter(c => c.userId === "user_1").length,
    icon: Users,
    color: "primary",
    href: "/characters",
  },
  {
    title: "Kampanyalar",
    value: mockCampaigns.filter(c => c.creatorId === "user_1").length,
    icon: Swords,
    color: "secondary",
    href: "/campaigns",
  },
  {
    title: "Aktif Oturumlar",
    value: mockCampaigns.filter(c => c.status === "ACTIVE").length,
    icon: Play,
    color: "success",
    href: "/campaigns",
  },
  {
    title: "Toplam Mesaj",
    value: mockMessages.length,
    icon: TrendingUp,
    color: "info",
    href: "#",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const userCharacters = mockCharacters.filter(c => c.userId === "user_1").slice(0, 3);
  const activeCampaigns = mockCampaigns.filter(c => c.status === "ACTIVE").slice(0, 2);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            Hoş geldin, <span className="text-primary">{user?.username}</span>!
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
              Yeni Kampanya
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
              <Card hover className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-secondary mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-${stat.color}/10`}>
                      <Icon className={`h-6 w-6 text-${stat.color}`} />
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
              {userCharacters.length > 0 ? (
                userCharacters.map((character) => (
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
                          variant={character.hp < character.maxHp / 3 ? "danger" : character.hp < character.maxHp / 2 ? "warning" : "success"}
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
              Aktif Kampanyalar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCampaigns.length > 0 ? (
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
                  <p className="text-sm text-foreground-secondary line-clamp-2 mb-3">
                    {campaign.description}
                  </p>
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
                  Aktif kampanya yok
                </p>
                <Link href="/campaigns/new">
                  <Button size="sm" variant="outline">Kampanya Başlat</Button>
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
              { href: "/campaigns/join", icon: Users, label: "Kampanyaya Katıl", desc: "Davet koduyla katıl" },
              { href: "/scenarios", icon: Map, label: "Senaryolar", desc: "Macera senaryolarını keşfet" },
              { href: "/rules", icon: Clock, label: "Kurallar", desc: "D&D 5e kurallarını incele" },
              { href: "/profile", icon: TrendingUp, label: "Profil", desc: "Ayarlarını düzenle" },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={i} href={action.href}>
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
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


