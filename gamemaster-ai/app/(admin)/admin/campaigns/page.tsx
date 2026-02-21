"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Spinner,
  useToast,
  ConfirmDialog,
} from "@/components/ui";
import { Search, Trash2, Swords, ChevronLeft, ChevronRight } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  creator: { username: string; email: string };
  _count: { players: number; sessions: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await fetch(`/api/admin/campaigns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, debouncedSearch]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/campaigns?id=${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== deleteId));
        addToast({ type: "success", title: "Oturum silindi" });
      }
    } catch {
      addToast({ type: "error", title: "Silinemedi" });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading && campaigns.length === 0) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER KISMI GÜNCELLENDİ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Oturumlar</h1>
          <p className="text-foreground-secondary">Oyun odalarını yönet ({pagination.total} toplam)</p>
        </div>
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Oturum ara..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72" 
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-elevated border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium">Oturum Adı</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Oluşturan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Durum</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Detaylar</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border hover:bg-background-elevated/50">
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      <Swords className="h-4 w-4 text-primary" />
                      {campaign.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {campaign.creator.username}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={campaign.status === "ACTIVE" ? "success" : "outline"}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {campaign._count.players} Oyuncu, {campaign._count.sessions} Oturum
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(campaign.id)}
                        className="text-danger"
                        title="Sil"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-foreground-muted">
                      Oturum bulunamadı.
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
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
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
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Oturumu Sil"
        description="Bu işlem geri alınamaz."
        variant="danger"
        confirmText="Sil"
      />
    </div>
  );
}
