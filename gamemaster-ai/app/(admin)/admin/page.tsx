"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { mockUsers, mockCharacters, mockCampaigns, mockScenarios } from "@/lib/mock-data";
import {
  Users,
  Swords,
  Map,
  TrendingUp,
  Activity,
  ArrowRight,
  UserPlus,
  Play,
} from "lucide-react";

const stats = [
  {
    title: "Toplam Kullanıcı",
    value: mockUsers.length,
    icon: Users,
    color: "primary",
    change: "+12%",
  },
  {
    title: "Toplam Karakter",
    value: mockCharacters.length,
    icon: UserPlus,
    color: "secondary",
    change: "+8%",
  },
  {
    title: "Aktif Kampanya",
    value: mockCampaigns.filter((c) => c.status === "ACTIVE").length,
    icon: Swords,
    color: "success",
    change: "+24%",
  },
  {
    title: "Senaryo",
    value: mockScenarios.length,
    icon: Map,
    color: "info",
    change: "+5%",
  },
];

const recentActivity = [
  { action: "Yeni kullanıcı kaydı", user: "DungeonMaster42", time: "2 dakika önce" },
  { action: "Kampanya oluşturuldu", user: "Adventurer", time: "15 dakika önce" },
  { action: "Karakter seviye atladı", user: "DragonSlayer", time: "1 saat önce" },
  { action: "Senaryo tamamlandı", user: "MysticMage", time: "3 saat önce" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-foreground-secondary">
          Sistem genel bakış ve yönetim
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-secondary mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-success mt-1">{stat.change} bu ay</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}/10`}>
                    <Icon className={`h-6 w-6 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Hızlı Erişim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/admin/users">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Users className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Kullanıcı Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Kullanıcıları görüntüle ve yönet
                  </p>
                </div>
              </Link>
              <Link href="/admin/scenarios">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Map className="h-6 w-6 text-secondary mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Senaryo Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Senaryoları moderasyon et
                  </p>
                </div>
              </Link>
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                <Activity className="h-6 w-6 text-success mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium">Sistem İstatistikleri</h4>
                <p className="text-sm text-foreground-secondary">
                  Detaylı analiz ve raporlar
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                <Play className="h-6 w-6 text-warning mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium">Aktif Oturumlar</h4>
                <p className="text-sm text-foreground-secondary">
                  Canlı oyun oturumlarını izle
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Son Aktiviteler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-foreground-muted">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Son Kullanıcılar</CardTitle>
          <Link href="/admin/users">
            <Badge variant="outline" className="cursor-pointer hover:bg-background-elevated">
              Tümünü Gör
              <ArrowRight className="h-3 w-3 ml-1" />
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">
                    Kullanıcı
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">
                    E-posta
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">
                    Rol
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">
                    Kayıt Tarihi
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-background-elevated">
                    <td className="py-3 px-4">
                      <span className="font-medium">{user.username}</span>
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary">
                      {user.email}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          user.role === "ADMIN"
                            ? "danger"
                            : user.role === "MEMBER"
                            ? "primary"
                            : "default"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


