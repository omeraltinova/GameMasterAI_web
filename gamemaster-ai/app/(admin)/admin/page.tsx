"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, Progress } from "@/components/ui";
import {
  Users,
  Swords,
  Map,
  TrendingUp,
  Activity,
  UserPlus,
  Play,
  Settings,
} from "lucide-react";

interface DashboardData {
  stats: {
    users: number;
    characters: number;
    activeCampaigns: number;
    scenarios: number;
  };
  recentUsers: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  analytics: {
    activeUsers: {
      today: number;
      last7Days: number;
      last30Days: number;
    };
    dailyActiveUsers: Array<{
      date: string;
      count: number;
    }>;
    campaignCompletion: {
      completed: number;
      total: number;
      rate: number;
    };
    scenarioUsageTrend: Array<{
      date: string;
      count: number;
    }>;
    topCreators: Array<{
      id: string;
      username: string;
      email: string;
      scenarios: number;
    }>;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const jsonData = await res.json();
          setData(jsonData);
        }
      } catch (error) {
        console.error("Dashboard verisi yüklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    secondary: { bg: "bg-secondary/10", text: "text-secondary" },
    success: { bg: "bg-success/10", text: "text-success" },
    info: { bg: "bg-info/10", text: "text-info" },
  };

  const stats = [
    {
      title: "Toplam Kullanıcı",
      value: data?.stats.users || 0,
      icon: Users,
      color: "primary",
    },
    {
      title: "Toplam Karakter",
      value: data?.stats.characters || 0,
      icon: UserPlus,
      color: "secondary",
    },
    {
      title: "Aktif Oturum",
      value: data?.stats.activeCampaigns || 0,
      icon: Swords,
      color: "success",
    },
    {
      title: "Senaryo",
      value: data?.stats.scenarios || 0,
      icon: Map,
      color: "info",
    },
  ];

  const analytics = data?.analytics;
  const dailyActive = analytics?.dailyActiveUsers || [];
  const usageTrend = analytics?.scenarioUsageTrend || [];
  const completionPercent = Math.round((analytics?.campaignCompletion.rate || 0) * 100);
  const maxDaily = Math.max(1, ...dailyActive.map((item) => item.count));
  const maxUsage = Math.max(1, ...usageTrend.map((item) => item.count));

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
                  </div>
                  <div className={`p-3 rounded-xl ${colorMap[stat.color]?.bg}`}>
                    <Icon className={`h-6 w-6 ${colorMap[stat.color]?.text}`} />
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
              {/* Kullanıcı Yönetimi */}
              <Link href="/admin/users">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Users className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Kullanıcı Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Kullanıcıları görüntüle ve yönet
                  </p>
                </div>
              </Link>

              {/* Senaryo Yönetimi */}
              <Link href="/admin/scenarios">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Map className="h-6 w-6 text-secondary mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Senaryo Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Senaryoları moderasyon et
                  </p>
                </div>
              </Link>

              {/* Oturum Yönetimi */}
              <Link href="/admin/campaigns">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Swords className="h-6 w-6 text-success mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Oturum Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Oturumları denetle ve yönet
                  </p>
                </div>
              </Link>

              {/* Karakter Yönetimi */}
              <Link href="/admin/characters">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Users className="h-6 w-6 text-warning mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Karakter Yönetimi</h4>
                  <p className="text-sm text-foreground-secondary">
                    Tüm karakterleri görüntüle ve yönet
                  </p>
                </div>
              </Link>

              {/* Aktif Oturumlar */}
              <Link href="/admin/active-sessions">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Play className="h-6 w-6 text-danger mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Aktif Oturumlar</h4>
                  <p className="text-sm text-foreground-secondary">
                    Canlı oyun oturumlarını izle ve yönet
                  </p>
                </div>
              </Link>

              {/* Sistem Ayarları */}
              <Link href="/admin/settings">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group">
                  <Settings className="h-6 w-6 text-info mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="font-medium">Sistem Ayarları</h4>
                  <p className="text-sm text-foreground-secondary">
                    Bakım modu ve denetim kayıtları
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Son Kayıt Olanlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentUsers.map((user, i) => (
                <div
                  key={user.id}
                  className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-foreground-muted">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))}
              {!data?.recentUsers.length && (
                <p className="text-sm text-foreground-muted">
                  Henüz kayıtlı kullanıcı yok.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Analitik Özet</h2>
          <p className="text-foreground-secondary text-sm">Son 30 günün genel durumu</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Aktif Kullanıcılar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm text-foreground-secondary">Bugün</p>
                  <p className="text-2xl font-bold">{analytics?.activeUsers.today || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">7 Gün</p>
                  <p className="text-2xl font-bold">{analytics?.activeUsers.last7Days || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">30 Gün</p>
                  <p className="text-2xl font-bold">{analytics?.activeUsers.last30Days || 0}</p>
                </div>
              </div>
              <div className="space-y-2">
                {dailyActive.map((item) => (
                  <div key={item.date} className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted w-20">
                      {new Date(item.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-background-elevated overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(item.count / maxDaily) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-foreground-secondary w-6 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Oturum Tamamlanma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground-secondary">Tamamlanan</p>
                  <p className="text-2xl font-bold">{analytics?.campaignCompletion.completed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Toplam</p>
                  <p className="text-2xl font-bold">{analytics?.campaignCompletion.total || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Oran</p>
                  <p className="text-2xl font-bold">%{completionPercent}</p>
                </div>
              </div>
              <Progress
                value={completionPercent}
                max={100}
                variant="success"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analytics?.topCreators || []).map((creator) => (
                  <div key={creator.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{creator.username}</p>
                      <p className="text-xs text-foreground-muted">{creator.email}</p>
                    </div>
                    <Badge variant="secondary">{creator.scenarios} senaryo</Badge>
                  </div>
                ))}
                {!analytics?.topCreators?.length && (
                  <p className="text-sm text-foreground-muted">Henüz veri yok.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Senaryo Kullanım Trendi (14 Gün)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usageTrend.map((item) => (
              <div key={item.date} className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted w-20">
                  {new Date(item.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                </span>
                <div className="flex-1 h-2 rounded-full bg-background-elevated overflow-hidden">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: `${(item.count / maxUsage) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-secondary w-6 text-right">{item.count}</span>
              </div>
            ))}
            {!usageTrend.length && (
              <p className="text-sm text-foreground-muted">Henüz veri yok.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
