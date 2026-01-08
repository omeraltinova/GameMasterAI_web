"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui";
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

              {/* Aktif Oturumlar (Henüz sayfası yok, placeholder kalabilir) */}
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-elevated transition-all cursor-pointer group opacity-70">
                <Play className="h-6 w-6 text-warning mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium">Aktif Oturumlar</h4>
                <p className="text-sm text-foreground-secondary">
                  Canlı oyun oturumlarını izle (Çok yakında)
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
    </div>
  );
}