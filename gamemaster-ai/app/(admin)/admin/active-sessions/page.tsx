"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Input,
  Modal,
  Spinner,
  useToast,
} from "@/components/ui";
import {
  Eye,
  PauseCircle,
  RefreshCw,
  Search,
  MessageSquare,
} from "lucide-react";

interface ActiveSessionMessage {
  id: string;
  senderType: string;
  senderName: string | null;
  content: string;
  timestamp: string;
}

interface ActiveSessionItem {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  updatedAt: string;
  creator: { username: string; email: string };
  scenario: { id: string; title: string } | null;
  playersCount: number;
  session: {
    id: string;
    updatedAt: string;
    aiContext: string;
    aiContextSummary: string;
    lastMessages: ActiveSessionMessage[];
  } | null;
}

type ActionType = "force_close" | "reset";

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<ActiveSessionItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: ActionType; session: ActiveSessionItem } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch("/api/admin/active-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Aktif oturumlar alınamadı", error);
      addToast({ type: "error", title: "Hata", description: "Aktif oturumlar yüklenemedi" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction?.session?.session) return;
    const sessionId = confirmAction.session.session.id;
    setActionLoadingId(sessionId);
    try {
      const res = await fetch(`/api/admin/active-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmAction.type }),
      });

      if (!res.ok) {
        throw new Error("İşlem başarısız");
      }

      if (confirmAction.type === "force_close") {
        setSessions((prev) => prev.filter((item) => item.session?.id !== sessionId));
        addToast({ type: "success", title: "Oturum duraklatıldı" });
      } else {
        addToast({ type: "success", title: "Oturum sıfırlandı" });
        fetchActiveSessions();
      }
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "İşlem yapılamadı" });
    } finally {
      setConfirmAction(null);
      setActionLoadingId(null);
    }
  };

  const filteredSessions = sessions.filter((item) => {
    const normalized = searchTerm.toLowerCase();
    const scenarioTitle = item.scenario?.title || "";
    return (
      item.campaignName.toLowerCase().includes(normalized) ||
      item.creator.username.toLowerCase().includes(normalized) ||
      scenarioTitle.toLowerCase().includes(normalized)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Aktif Oturumlar</h1>
          <p className="text-foreground-secondary">Canlı oturumları izle ve yönet</p>
        </div>
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Oturum, yazar veya senaryo ara..."
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
                  <th className="text-left py-3 px-4 text-sm font-medium">Oturum</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Senaryo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Oyuncu</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Son Aktivite</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Mesaj Özeti</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">AI Context</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((item) => {
                  const lastMessages = item.session?.lastMessages || [];
                  const previewMessages = lastMessages.slice(-2);
                  const lastActivity = item.session?.updatedAt || item.updatedAt;

                  return (
                    <tr key={item.campaignId} className="border-b border-border hover:bg-background-elevated/50">
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{item.campaignName}</span>
                          <span className="text-xs text-foreground-muted">
                            {item.creator.username}
                          </span>
                          <Badge variant={item.campaignStatus === "ACTIVE" ? "success" : "outline"} className="w-fit">
                            {item.campaignStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground-secondary">
                        {item.scenario?.title || "Özel Oturum"}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground-secondary">
                        {item.playersCount} oyuncu
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground-secondary">
                        {new Date(lastActivity).toLocaleString("tr-TR")}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground-secondary space-y-2">
                        {previewMessages.length > 0 ? (
                          previewMessages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-2">
                              <MessageSquare className="h-3 w-3 text-foreground-muted mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-foreground-secondary">
                                  {msg.senderName || msg.senderType}
                                </p>
                                <p className="text-foreground-muted">
                                  {msg.content.length > 80 ? `${msg.content.slice(0, 80)}…` : msg.content}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-foreground-muted">Mesaj yok</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground-secondary">
                        {item.session?.aiContextSummary || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSession(item)}
                            title="Detaylar"
                            aria-label="Detaylar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmAction({ type: "reset", session: item })}
                            isLoading={actionLoadingId === item.session?.id}
                            disabled={!item.session}
                            title="Oturumu sıfırla"
                            aria-label="Oturumu sıfırla"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            onClick={() => setConfirmAction({ type: "force_close", session: item })}
                            isLoading={actionLoadingId === item.session?.id}
                            disabled={!item.session}
                            title="Oturumu duraklat"
                            aria-label="Oturumu duraklat"
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-foreground-muted">
                      Aktif oturum bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!selectedSession}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
        title="Oturum Detayı"
        description={selectedSession ? `${selectedSession.campaignName} • ${selectedSession.creator.username}` : undefined}
        size="xl"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground-secondary mb-2">AI Context</h3>
            <div className="rounded-lg border border-border bg-background-secondary p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
              {selectedSession?.session?.aiContext || "AI context bulunamadı."}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-secondary mb-2">Son Mesajlar</h3>
            <div className="space-y-3">
              {(selectedSession?.session?.lastMessages || []).map((msg) => (
                <div key={msg.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1 text-xs text-foreground-muted">
                    <span>{msg.senderName || msg.senderType}</span>
                    <span>{new Date(msg.timestamp).toLocaleString("tr-TR")}</span>
                  </div>
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              ))}
              {(selectedSession?.session?.lastMessages || []).length === 0 && (
                <p className="text-sm text-foreground-muted">Bu oturumda mesaj yok.</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={confirmAction?.type === "reset" ? "Oturumu Sıfırla" : "Oturumu Duraklat"}
        description={
          confirmAction?.type === "reset"
            ? "Bu işlem tüm mesajları sıfırlar ve yeni bir başlangıç yapar."
            : "Bu işlem oturumu duraklatır ve oyuncular erişemez."
        }
        variant={confirmAction?.type === "reset" ? "warning" : "danger"}
        confirmText={confirmAction?.type === "reset" ? "Sıfırla" : "Duraklat"}
      />
    </div>
  );
}
