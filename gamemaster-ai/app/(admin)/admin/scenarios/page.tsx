"use client";

import { useState, useEffect } from "react";
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
import { Search, Trash2, Map, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: string;
  difficulty: string;
  isOfficial: boolean;
  createdAt: string;
  creator: {
    username: string;
    email: string;
  } | null;
  _count: {
    campaigns: number;
  };
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch("/api/admin/scenarios");
      if (res.ok) {
        setScenarios(await res.json());
      }
    } catch (error) {
      console.error("Senaryolar yüklenemedi", error);
      addToast({ type: "error", title: "Hata", description: "Veriler yüklenemedi" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/scenarios?id=${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setScenarios(scenarios.filter((s) => s.id !== deleteId));
        addToast({ type: "success", title: "Başarılı", description: "Senaryo silindi." });
      } else {
        throw new Error("Silme başarısız");
      }
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Senaryo silinemedi." });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredScenarios = scenarios.filter((s) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const creatorName = s.creator?.username || "";
    return (
      s.title.toLowerCase().includes(normalizedSearch) ||
      creatorName.toLowerCase().includes(normalizedSearch)
    );
  });

  if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Senaryolar</h1>
          <p className="text-foreground-secondary">Tüm oyun senaryolarını yönet</p>
        </div>
        <div className="w-full sm:w-auto">
          <Input
            placeholder="Senaryo veya yazar ara..."
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
                  <th className="text-left py-3 px-4 text-sm font-medium">Senaryo Adı</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Yazar</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Tür / Zorluk</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Kullanım</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-b border-border hover:bg-background-elevated/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Map className="h-4 w-4 text-secondary" />
                        <div>
                          <p className="font-medium">{scenario.title}</p>
                          {scenario.isOfficial && (
                            <Badge variant="primary" className="mt-1 text-[10px] py-0 h-4">Resmi</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {scenario.creator ? scenario.creator.username : <span className="text-foreground-muted italic">Anonim</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">{scenario.genre}</Badge>
                        <span className="text-xs text-foreground-muted">{scenario.difficulty}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {scenario._count.campaigns} Kampanya
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/scenarios/${scenario.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" title="Görüntüle">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => setDeleteId(scenario.id)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredScenarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-foreground-muted">
                      Senaryo bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Senaryoyu Sil"
        description="Bu senaryo kalıcı olarak silinecek. Emin misiniz?"
        variant="danger"
        confirmText="Sil"
      />
    </div>
  );
}
