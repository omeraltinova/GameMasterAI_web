
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { ArrowLeft, Play, Edit, Trash2, Map, Share2, Loader2, BookOpen } from "lucide-react";
// We don't have UseToast yet or verify it, using alert/confirm for now.

interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: string;
  difficulty: string;
  startingPrompt: string;
  tags: any;
  creatorId: string;
  createdAt: string;
  creator?: {
    username: string;
  };
}

export default function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const res = await fetch(`/api/scenarios/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setScenario(data);
      } catch (error) {
        console.error("Error:", error);
        router.push("/scenarios");
      } finally {
        setLoading(false);
      }
    };
    fetchScenario();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Bu senaryoyu silmek istediğinize emin misiniz?")) return;
    
    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/scenarios");
        router.refresh();
      } else {
        alert("Silme işlemi başarısız. Yetkiniz olmayabilir.");
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleStartCampaign = () => {
    router.push(`/campaigns/new?scenarioId=${id}`);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scenario) return null;

  const tags = typeof scenario.tags === 'string' ? JSON.parse(scenario.tags) : scenario.tags;

  return (
    <div className="w-full animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" className="-ml-3 gap-2 w-fit" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </Button>

        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
          <div className="space-y-4 flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight break-words">{scenario.title}</h1>
            <div className="flex flex-wrap gap-2 items-center text-sm text-foreground-muted">
              <span>Yazar: <span className="text-foreground font-medium">{scenario.creator?.username || "Bilinmiyor"}</span></span>
              <span>•</span>
              <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <Badge variant="outline">{scenario.genre}</Badge>
              <Badge variant={scenario.difficulty === "Hard" ? "danger" : scenario.difficulty === "Medium" ? "secondary" : "default"}>
                {scenario.difficulty}
              </Badge>
            </div>
            
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-secondary/50">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row lg:flex-col sm:items-center lg:items-stretch shrink-0">
            <Button size="lg" className="w-full sm:w-auto gap-2" onClick={handleStartCampaign}>
              <Play className="h-5 w-5" />
              Bu Senaryoyu Oyna
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => router.push(`/scenarios/${id}/edit`)}>
                <Edit className="h-4 w-4" />
                Düzenle
              </Button>
              <Button variant="danger" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Hikaye Özeti
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {scenario.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4 bg-background-elevated/50">
              <h2 className="text-lg font-semibold text-foreground-muted">GM Notları (Başlangıç)</h2>
              <p className="font-mono text-sm leading-relaxed text-foreground-secondary whitespace-pre-wrap break-words">
                {scenario.startingPrompt}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Sidebar Info */}
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold">Senaryo Detayları</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-foreground-muted">Tür</span>
                    <span>{scenario.genre}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-foreground-muted">Zorluk</span>
                    <span>{scenario.difficulty}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-foreground-muted">Oluşturulma</span>
                    <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <Button variant="secondary" className="w-full gap-2 mt-4" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link kopyalandı!");
                }}>
                  <Share2 className="h-4 w-4" />
                  Paylaş
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


