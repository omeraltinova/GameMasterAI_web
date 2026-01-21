"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Spinner,
  useToast,
  ConfirmDialog,
} from "@/components/ui";
import { Search, Trash2, Shield, User as UserIcon, ShieldAlert } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  _count: {
    characters: number;
    campaigns: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();

  // Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error("Kullanıcılar yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/users?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      
      setUsers(users.filter((u) => u.id !== deleteId));
      addToast({ type: "success", title: "Başarılı", description: "Kullanıcı silindi." });
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Kullanıcı silinemedi." });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleRole = async () => {
    if (!roleChangeId) return;
    const user = users.find((u) => u.id === roleChangeId);
    if (!user) return;

    const newRole = user.role === "ADMIN" ? "MEMBER" : "ADMIN";

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Güncelleme başarısız");
      }

      setUsers(users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      addToast({ type: "success", title: "Rol Güncellendi", description: `${user.username} artık ${newRole}.` });
    } catch (error: any) {
      addToast({ type: "error", title: "Hata", description: error.message });
    } finally {
      setRoleChangeId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcılar</h1>
          <p className="text-foreground-secondary">Sistemdeki üyeleri yönet</p>
        </div>
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Kullanıcı ara..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  <th className="text-left py-3 px-4 text-sm font-medium">İstatistikler</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Kayıt Tarihi</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-background-elevated/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-foreground-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.role === "ADMIN" ? "danger" : "primary"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {user._count.characters} Karakter, {user._count.campaigns} Kampanya
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRoleChangeId(user.id)}
                          title="Rol Değiştir"
                          aria-label="Rol Değiştir"
                        >
                          {user.role === "ADMIN" ? <ShieldAlert className="h-4 w-4 text-warning" /> : <Shield className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => setDeleteId(user.id)}
                          title="Sil"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Kullanıcıyı Sil"
        description="Bu kullanıcı ve tüm verileri (karakterler, kampanyalar) kalıcı olarak silinecek. Emin misiniz?"
        variant="danger"
        confirmText="Sil"
      />

      <ConfirmDialog
        isOpen={!!roleChangeId}
        onClose={() => setRoleChangeId(null)}
        onConfirm={toggleRole}
        title="Yetki Değişikliği"
        description="Bu kullanıcının yetki seviyesini değiştirmek üzeresiniz."
        confirmText="Değiştir"
      />
    </div>
  );
}
