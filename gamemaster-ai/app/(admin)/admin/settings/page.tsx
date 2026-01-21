"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Select,
  Spinner,
  Badge,
  useToast,
} from "@/components/ui";
import { Save, RefreshCw, ShieldAlert } from "lucide-react";

interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  aiPrimaryModel: string;
  aiFallbackModel: string;
  aiRequestsPerMinute: number;
  updatedAt?: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  admin: {
    id: string;
    username: string;
    email: string;
  };
}

const defaultSettings: SystemSettings = {
  maintenanceMode: false,
  maintenanceMessage: "",
  aiPrimaryModel: "",
  aiFallbackModel: "",
  aiRequestsPerMinute: 30,
  updatedAt: null,
};

function formatActionLabel(action: string) {
  switch (action) {
    case "SYSTEM_SETTINGS_UPDATE":
      return "Sistem Ayarları";
    case "USER_DELETE":
      return "Kullanıcı Silme";
    case "USER_ROLE_UPDATE":
      return "Rol Güncelleme";
    case "CAMPAIGN_DELETE":
      return "Kampanya Silme";
    case "SCENARIO_DELETE":
      return "Senaryo Silme";
    case "SCENARIO_OFFICIAL_TOGGLE":
      return "Senaryo Resmi";
    default:
      return action;
  }
}

function formatActionDetail(entry: AuditLogEntry) {
  const metadata = entry.metadata || {};

  if (entry.action === "USER_ROLE_UPDATE") {
    const username = metadata.username ? String(metadata.username) : "Kullanıcı";
    const fromRole = metadata.fromRole ? String(metadata.fromRole) : "?";
    const toRole = metadata.toRole ? String(metadata.toRole) : "?";
    return `${username}: ${fromRole} → ${toRole}`;
  }

  if (entry.action === "USER_DELETE") {
    const username = metadata.username ? String(metadata.username) : "Kullanıcı";
    const email = metadata.email ? String(metadata.email) : "";
    return `${username}${email ? ` (${email})` : ""}`;
  }

  if (entry.action === "CAMPAIGN_DELETE") {
    const name = metadata.name ? String(metadata.name) : "Kampanya";
    const status = metadata.status ? String(metadata.status) : "";
    return `${name}${status ? ` • ${status}` : ""}`;
  }

  if (entry.action === "SCENARIO_OFFICIAL_TOGGLE" || entry.action === "SCENARIO_DELETE") {
    const title = metadata.title ? String(metadata.title) : "Senaryo";
    if (entry.action === "SCENARIO_OFFICIAL_TOGGLE") {
      const from = metadata.from ? "Resmi" : "Normal";
      const to = metadata.to ? "Resmi" : "Normal";
      return `${title}: ${from} → ${to}`;
    }
    return title;
  }

  if (entry.action === "SYSTEM_SETTINGS_UPDATE") {
    const maintenance = metadata.maintenanceMode ? "Açık" : "Kapalı";
    const model = metadata.aiPrimaryModel ? String(metadata.aiPrimaryModel) : "-";
    return `Bakım: ${maintenance} • Model: ${model}`;
  }

  return entry.entityType ? `${entry.entityType} ${entry.entityId || ""}`.trim() : "-";
}

function getActionBadgeVariant(action: string) {
  if (action.includes("DELETE")) return "danger";
  if (action.includes("ROLE")) return "warning";
  if (action.includes("SETTINGS")) return "secondary";
  if (action.includes("OFFICIAL")) return "primary";
  return "outline";
}

export default function AdminSettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const hasMaintenance = settings.maintenanceMode;

  const updatedLabel = useMemo(() => {
    if (!settings.updatedAt) return null;
    return new Date(settings.updatedAt).toLocaleString("tr-TR");
  }, [settings.updatedAt]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          maintenanceMode: Boolean(data.maintenanceMode),
          maintenanceMessage: data.maintenanceMessage || "",
          aiPrimaryModel: data.aiPrimaryModel || "",
          aiFallbackModel: data.aiFallbackModel || "",
          aiRequestsPerMinute: Number(data.aiRequestsPerMinute) || 0,
          updatedAt: data.updatedAt || null,
        });
      }
    } catch (error) {
      console.error("Sistem ayarları yüklenemedi", error);
      addToast({ type: "error", title: "Hata", description: "Sistem ayarları yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit?limit=30");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.data || []);
      }
    } catch (error) {
      console.error("Audit log yüklenemedi", error);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Kaydedildi", description: "Sistem ayarları güncellendi." });
        await loadData();
        await loadAuditLogs();
      } else {
        throw new Error("Kaydetme başarısız");
      }
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Sistem ayarları güncellenemedi." });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Sistem Ayarları</h1>
          <p className="text-foreground-secondary">Bakım modu, model seçimi ve denetim kayıtları</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Yenile
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
            Kaydet
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Bakım Modu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Bakım Durumu"
            value={hasMaintenance ? "on" : "off"}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, maintenanceMode: e.target.value === "on" }))
            }
            options={[
              { value: "off", label: "Kapalı (Normal Erişim)" },
              { value: "on", label: "Açık (Admin hariç kilit)" },
            ]}
          />
          <Textarea
            label="Bakım Mesajı"
            value={settings.maintenanceMessage}
            onChange={(e) => setSettings((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
            placeholder="Bakım mesajı (opsiyonel)"
            rows={3}
          />
          {updatedLabel && (
            <p className="text-xs text-foreground-muted">Son güncelleme: {updatedLabel}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Primary Model"
              value={settings.aiPrimaryModel}
              onChange={(e) => setSettings((prev) => ({ ...prev, aiPrimaryModel: e.target.value }))}
              placeholder="anthropic/claude-3-sonnet"
            />
            <Input
              label="Fallback Model"
              value={settings.aiFallbackModel}
              onChange={(e) => setSettings((prev) => ({ ...prev, aiFallbackModel: e.target.value }))}
              placeholder="openai/gpt-4-turbo"
            />
          </div>
          <Input
            label="AI İstek Limiti (dakika)"
            type="number"
            min={0}
            value={settings.aiRequestsPerMinute}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                aiRequestsPerMinute: Number(e.target.value),
              }))
            }
            hint="0 veya boş değer = sınırsız"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Denetim Kayıtları</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditLoading ? (
            <div className="flex justify-center p-8">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-elevated border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium">Zaman</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Admin</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">İşlem</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id} className="border-b border-border hover:bg-background-elevated/50">
                      <td className="py-3 px-4 text-sm text-foreground-secondary">
                        {new Date(entry.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium">{entry.admin?.username || "Admin"}</div>
                        <div className="text-xs text-foreground-muted">{entry.admin?.email || ""}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(entry.action)}>
                          {formatActionLabel(entry.action)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground-secondary">
                        {formatActionDetail(entry)}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-foreground-muted">
                        Henüz denetim kaydı yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
