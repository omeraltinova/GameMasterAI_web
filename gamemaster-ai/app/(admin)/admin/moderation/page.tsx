"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Select,
  Spinner,
  useToast,
} from "@/components/ui";
import { CheckCircle2, Clock3, Search, ShieldAlert, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface ModerationEntity {
  entityType: "SCENARIO" | "CAMPAIGN" | "MESSAGE";
  entityId: string;
  title: string;
  subtitle: string;
  preview: string;
  isSoftDeleted: boolean;
}

interface ModerationReport {
  id: string;
  entityType: "SCENARIO" | "CAMPAIGN" | "MESSAGE";
  entityId: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    username: string;
    email: string;
  } | null;
  entity: ModerationEntity | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ReportStats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function ModerationPage() {
  const { addToast } = useToast();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [entityType, setEntityType] = useState("ALL");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [stats, setStats] = useState<ReportStats>({ pending: 0, approved: 0, rejected: 0 });
  const [decisionTarget, setDecisionTarget] = useState<{ id: string; action: "APPROVE" | "REJECT" } | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status,
        entityType,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/admin/moderation/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Moderasyon raporları alınamadı");
      }

      const payload = await response.json();
      setReports(payload.reports || []);
      setStats(payload.stats || { pending: 0, approved: 0, rejected: 0 });
      setPagination(payload.pagination || pagination);
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Moderasyon kuyruğu yüklenemedi" });
    } finally {
      setLoading(false);
    }
  }, [addToast, debouncedSearch, entityType, pagination.limit, pagination.page, status]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const runDecision = async () => {
    if (!decisionTarget) return;

    const report = reports.find((item) => item.id === decisionTarget.id);
    if (!report) return;

    try {
      setDecisionLoading(true);
      const response = await fetch(`/api/admin/moderation/reports/${decisionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decisionTarget.action,
          applySoftDelete: decisionTarget.action === "APPROVE",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Moderasyon aksiyonu başarısız");
      }

      const statusAfter: ModerationReport["status"] =
        decisionTarget.action === "APPROVE" ? "APPROVED" : "REJECTED";
      setReports((prev) =>
        prev
          .map((item) => (item.id === decisionTarget.id ? { ...item, status: statusAfter } : item))
          .filter((item) => (status === "ALL" ? true : item.status === status))
      );

      addToast({
        type: "success",
        title: "Başarılı",
        description: decisionTarget.action === "APPROVE"
          ? "Rapor onaylandı, içerik pasifleştirildi."
          : "Rapor reddedildi.",
      });

      if (status === "PENDING") {
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
      await fetchReports();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Moderasyon aksiyonu başarısız";
      addToast({ type: "error", title: "Hata", description: message });
    } finally {
      setDecisionLoading(false);
      setDecisionTarget(null);
    }
  };

  const statusBadgeVariant = (value: ModerationReport["status"]) => {
    if (value === "APPROVED") return "success" as const;
    if (value === "REJECTED") return "danger" as const;
    return "warning" as const;
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex justify-center p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Moderasyon Kuyruğu</h1>
        <p className="text-foreground-secondary">Raporlanan içerikleri inceleyin ve aksiyon alın.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Bekleyen</p>
                <p className="text-2xl font-semibold">{stats.pending}</p>
              </div>
              <Clock3 className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Onaylanan</p>
                <p className="text-2xl font-semibold">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Reddedilen</p>
                <p className="text-2xl font-semibold">{stats.rejected}</p>
              </div>
              <XCircle className="h-5 w-5 text-danger" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Sebep / kullanıcı ara"
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            options={[
              { value: "PENDING", label: "Bekleyen" },
              { value: "APPROVED", label: "Onaylanan" },
              { value: "REJECTED", label: "Reddedilen" },
              { value: "ALL", label: "Tümü" },
            ]}
          />
          <Select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            options={[
              { value: "ALL", label: "Tüm İçerikler" },
              { value: "SCENARIO", label: "Senaryo" },
              { value: "CAMPAIGN", label: "Kampanya" },
              { value: "MESSAGE", label: "Mesaj" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-elevated border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium">Rapor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">İçerik</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Durum</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Tarih</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-border align-top">
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <Badge variant="outline">{report.reason}</Badge>
                        <div className="text-sm font-medium">{report.reporter.username}</div>
                        <div className="text-xs text-foreground-muted">{report.reporter.email}</div>
                        {report.details && (
                          <p className="text-xs text-foreground-secondary">{report.details}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {report.entity ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{report.entity.title}</div>
                          <div className="text-xs text-foreground-muted">{report.entity.subtitle}</div>
                          <p className="text-xs text-foreground-secondary">{report.entity.preview || "Önizleme yok"}</p>
                          {report.entity.isSoftDeleted && (
                            <Badge variant="danger">Pasif</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-danger">İçerik bulunamadı</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      <div>{new Date(report.createdAt).toLocaleString("tr-TR")}</div>
                      {report.reviewedAt && (
                        <div className="text-xs text-foreground-muted">
                          Karar: {new Date(report.reviewedAt).toLocaleString("tr-TR")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {report.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDecisionTarget({ id: report.id, action: "REJECT" })}
                          >
                            Reddet
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setDecisionTarget({ id: report.id, action: "APPROVE" })}
                          >
                            Onayla
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end text-xs text-foreground-muted">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-foreground-muted">
                      Kriterlere uygun rapor bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-foreground-muted">
                Sayfa {pagination.page} / {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={decisionTarget?.action === "APPROVE"}
        onClose={() => setDecisionTarget(null)}
        onConfirm={runDecision}
        isLoading={decisionLoading}
        title="Raporu Onayla"
        description="Bu rapor onaylanacak ve raporlanan içerik pasifleştirilecek. Devam etmek istiyor musunuz?"
        confirmText="Onayla"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={decisionTarget?.action === "REJECT"}
        onClose={() => setDecisionTarget(null)}
        onConfirm={runDecision}
        isLoading={decisionLoading}
        title="Raporu Reddet"
        description="Bu rapor reddedilecek ve içerik aktif kalacak. Devam etmek istiyor musunuz?"
        confirmText="Reddet"
        variant="info"
      />
    </div>
  );
}
