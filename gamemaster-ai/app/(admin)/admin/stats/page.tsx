"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress, Spinner, Button } from "@/components/ui";

interface DashboardData {
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

function formatDateLabel(dateKey: string) {
  const date = new Date(dateKey);
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

export default function AdminStatsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "İstatistikler yüklenemedi");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İstatistikler yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const completionRate = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.analytics.campaignCompletion.rate || 0) * 100);
  }, [data]);

  const maxDailyActive = useMemo(() => {
    if (!data?.analytics.dailyActiveUsers.length) return 1;
    return Math.max(1, ...data.analytics.dailyActiveUsers.map((item) => item.count));
  }, [data]);

  const maxScenarioUsage = useMemo(() => {
    if (!data?.analytics.scenarioUsageTrend.length) return 1;
    return Math.max(1, ...data.analytics.scenarioUsageTrend.map((item) => item.count));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <Card>
          <CardHeader>
            <CardTitle>İstatistikler yüklenemedi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-danger">{error || "Bilinmeyen hata"}</p>
            <Button onClick={() => void fetchStats()}>Tekrar Dene</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">İstatistikler</h1>
        <p className="text-foreground-secondary">Platform kullanım metrikleri ve trendler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Aktif Oyuncu (Bugün)</p>
                <p className="text-3xl font-bold mt-1">{data.analytics.activeUsers.today}</p>
              </div>
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Aktif Oyuncu (7 Gün)</p>
                <p className="text-3xl font-bold mt-1">{data.analytics.activeUsers.last7Days}</p>
              </div>
              <Users className="h-6 w-6 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Aktif Oyuncu (30 Gün)</p>
                <p className="text-3xl font-bold mt-1">{data.analytics.activeUsers.last30Days}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-muted">Kampanya Tamamlama</p>
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-3xl font-bold">%{completionRate}</p>
            <Progress value={completionRate} />
            <p className="text-xs text-foreground-muted">
              {data.analytics.campaignCompletion.completed} / {data.analytics.campaignCompletion.total}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Günlük Aktif Oyuncu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.analytics.dailyActiveUsers.map((item) => {
              const width = Math.round((item.count / maxDailyActive) * 100);
              return (
                <div key={item.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{formatDateLabel(item.date)}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Senaryo Kullanım Trendi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.analytics.scenarioUsageTrend.map((item) => {
              const width = Math.round((item.count / maxScenarioUsage) * 100);
              return (
                <div key={item.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{formatDateLabel(item.date)}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background-elevated overflow-hidden">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En Üretken Senaryo Yazarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.analytics.topCreators.length === 0 ? (
            <p className="text-sm text-foreground-muted">Henüz veri yok.</p>
          ) : (
            data.analytics.topCreators.map((creator, index) => (
              <div
                key={creator.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">#{index + 1} {creator.username}</p>
                  <p className="text-xs text-foreground-muted truncate">{creator.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{creator.scenarios}</p>
                  <p className="text-xs text-foreground-muted">senaryo</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
