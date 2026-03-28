"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Spinner,
  useToast,
  ConfirmDialog,
  Modal,
  Textarea,
} from "@/components/ui";
import {
  Search,
  Shield,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Ban,
  UserX,
  UserCheck,
  NotebookPen,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  isSuspended: boolean;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  adminNote: string | null;
  isSoftDeleted: boolean;
  softDeletedAt: string | null;
  softDeleteReason: string | null;
  createdAt: string;
  _count: {
    characters: number;
    campaigns: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type PendingAction =
  | { type: "ROLE"; userId: string }
  | { type: "SUSPEND"; userId: string }
  | { type: "SOFT_DELETE"; userId: string }
  | { type: "RESTORE"; userId: string }
  | null;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteUserId, setNoteUserId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        throw new Error("Kullanıcılar alınamadı");
      }

      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Kullanıcılar yüklenemedi." });
    } finally {
      setLoading(false);
    }
  }, [addToast, debouncedSearch, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === (pendingAction?.userId || noteUserId || "")) || null,
    [noteUserId, pendingAction?.userId, users]
  );
  const noteUser = useMemo(
    () => users.find((user) => user.id === noteUserId) || null,
    [noteUserId, users]
  );

  const runUserPatch = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Kullanıcı güncellenemedi");
    }

    return data as User;
  };

  const applyPendingAction = async () => {
    if (!pendingAction) return;

    const user = users.find((item) => item.id === pendingAction.userId);
    if (!user) return;

    try {
      setActionLoading(true);

      if (pendingAction.type === "ROLE") {
        const nextRole = user.role === "ADMIN" ? "MEMBER" : "ADMIN";
        const updated = await runUserPatch({ userId: user.id, role: nextRole });
        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
        addToast({
          type: "success",
          title: "Rol güncellendi",
          description: `${user.username} artık ${nextRole}.`,
        });
      }

      if (pendingAction.type === "SUSPEND") {
        const nextSuspension = !user.isSuspended;
        const updated = await runUserPatch({
          userId: user.id,
          action: "SET_SUSPENSION",
          isSuspended: nextSuspension,
          suspensionReason: nextSuspension ? "Admin panelinden askıya alındı" : null,
        });

        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
        addToast({
          type: "success",
          title: nextSuspension ? "Kullanıcı askıya alındı" : "Askı kaldırıldı",
        });
      }

      if (pendingAction.type === "SOFT_DELETE") {
        const updated = await runUserPatch({
          userId: user.id,
          action: "SOFT_DELETE",
          softDeleteReason: "Admin panelinden pasifleştirildi",
        });
        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
        addToast({ type: "success", title: "Kullanıcı pasifleştirildi" });
      }

      if (pendingAction.type === "RESTORE") {
        const updated = await runUserPatch({ userId: user.id, action: "RESTORE_SOFT_DELETE" });
        setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
        addToast({ type: "success", title: "Kullanıcı geri alındı" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "İşlem başarısız";
      addToast({ type: "error", title: "Hata", description: message });
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const openNoteModal = (user: User) => {
    setNoteUserId(user.id);
    setNoteValue(user.adminNote || "");
  };

  const saveAdminNote = async () => {
    if (!noteUserId) return;
    try {
      setNoteSaving(true);
      const updated = await runUserPatch({
        userId: noteUserId,
        action: "SET_ADMIN_NOTE",
        adminNote: noteValue,
      });
      setUsers((prev) => prev.map((item) => (item.id === noteUserId ? { ...item, ...updated } : item)));
      addToast({ type: "success", title: "Admin notu güncellendi" });
      setNoteUserId(null);
      setNoteValue("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin notu kaydedilemedi";
      addToast({ type: "error", title: "Hata", description: message });
    } finally {
      setNoteSaving(false);
    }
  };

  const actionConfig = useMemo(() => {
    if (!pendingAction || !selectedUser) {
      return null;
    }

    if (pendingAction.type === "ROLE") {
      return {
        title: "Yetki Değişikliği",
        description: `${selectedUser.username} kullanıcısının rolü değiştirilecek.`,
        confirmText: "Değiştir",
        variant: "info" as const,
      };
    }

    if (pendingAction.type === "SUSPEND") {
      return {
        title: selectedUser.isSuspended ? "Askıyı Kaldır" : "Kullanıcıyı Askıya Al",
        description: selectedUser.isSuspended
          ? "Bu kullanıcı tekrar giriş yapabilecek."
          : "Bu kullanıcı oturum açamayacak.",
        confirmText: selectedUser.isSuspended ? "Kaldır" : "Askıya Al",
        variant: "warning" as const,
      };
    }

    if (pendingAction.type === "SOFT_DELETE") {
      return {
        title: "Kullanıcıyı Pasifleştir",
        description: "Kullanıcı ve içerikleri silinmeden pasif hale getirilecek.",
        confirmText: "Pasifleştir",
        variant: "danger" as const,
      };
    }

    return {
      title: "Kullanıcıyı Geri Al",
      description: "Pasif kullanıcı ve ilişkili içerikleri tekrar aktif hale getirilecek.",
      confirmText: "Geri Al",
      variant: "info" as const,
    };
  }, [pendingAction, selectedUser]);

  if (loading && users.length === 0) {
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
          <h1 className="text-3xl font-bold">Kullanıcılar</h1>
          <p className="text-foreground-secondary">Sistemdeki üyeleri yönet ({pagination.total} toplam)</p>
        </div>
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Kullanıcı ara..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-elevated border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium">Kullanıcı</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Rol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Durum</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">İstatistik</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Kayıt</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-background-elevated/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.username[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-foreground-muted">{user.email}</p>
                          {user.adminNote && (
                            <p className="text-xs text-foreground-secondary">Not: {user.adminNote}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.role === "ADMIN" ? "danger" : "primary"}>{user.role}</Badge>
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <Badge variant={user.isSuspended ? "warning" : "success"}>
                        {user.isSuspended ? "Askıda" : "Aktif"}
                      </Badge>
                      {user.isSoftDeleted && <Badge variant="danger">Pasif</Badge>}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {user._count.characters} Karakter, {user._count.campaigns} Oturum
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingAction({ type: "ROLE", userId: user.id })}
                          title="Rol değiştir"
                          aria-label="Rol değiştir"
                        >
                          {user.role === "ADMIN" ? <ShieldAlert className="h-4 w-4 text-warning" /> : <Shield className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingAction({ type: "SUSPEND", userId: user.id })}
                          title={user.isSuspended ? "Askıyı kaldır" : "Askıya al"}
                          aria-label={user.isSuspended ? "Askıyı kaldır" : "Askıya al"}
                        >
                          <Ban className={`h-4 w-4 ${user.isSuspended ? "text-success" : "text-warning"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openNoteModal(user)}
                          title="Admin notu"
                          aria-label="Admin notu"
                        >
                          <NotebookPen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={user.isSoftDeleted ? "text-success" : "text-danger"}
                          onClick={() =>
                            setPendingAction({
                              type: user.isSoftDeleted ? "RESTORE" : "SOFT_DELETE",
                              userId: user.id,
                            })
                          }
                          title={user.isSoftDeleted ? "Geri al" : "Pasifleştir"}
                          aria-label={user.isSoftDeleted ? "Geri al" : "Pasifleştir"}
                        >
                          {user.isSoftDeleted ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-foreground-muted">
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-foreground-muted">Sayfa {pagination.page} / {pagination.totalPages}</div>
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
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={applyPendingAction}
        isLoading={actionLoading}
        title={actionConfig?.title || "İşlemi Onayla"}
        description={actionConfig?.description || "Bu işlemi onaylıyor musunuz?"}
        confirmText={actionConfig?.confirmText || "Onayla"}
        variant={actionConfig?.variant || "warning"}
      />

      <Modal
        open={!!noteUserId}
        onOpenChange={(open) => {
          if (!open) {
            setNoteUserId(null);
            setNoteValue("");
          }
        }}
        title="Admin Notu"
        description={noteUser ? `${noteUser.username} için iç not` : ""}
      >
        <div className="space-y-4">
          <Textarea
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            rows={6}
            placeholder="Bu not sadece admin panelde görünür."
            maxLength={2000}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNoteUserId(null);
                setNoteValue("");
              }}
              disabled={noteSaving}
            >
              Vazgeç
            </Button>
            <Button variant="primary" onClick={saveAdminNote} isLoading={noteSaving}>
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
