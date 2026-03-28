"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent } from "@/components/ui";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { BookOpen, Loader2, ArrowLeft, Sparkles, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: string;
  difficulty: string;
  isOfficial: boolean;
  isAIGenerated: boolean;
  tags: any;
  creator?: {
    username?: string | null;
  };
}

interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  scenarios: Scenario[];
}

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initCollection = async () => {
      const { id } = await params;
      if (id) {
        fetchCollection(id);
      }
    };

    initCollection();
  }, [params]);

  const fetchCollection = async (id: string) => {
    try {
      const res = await fetch(`/api/scenarios/collections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data.collection);
      } else if (res.status === 404) {
        router.push("/scenarios/collections");
      }
    } catch (error) {
      console.error("Koleksiyon yüklenemedi", error);
      router.push("/scenarios/collections");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-foreground-muted">Yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link
          href="/scenarios/collections"
          className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Koleksiyonlara Dön
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-foreground-muted max-w-3xl">
                  {collection.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-foreground-muted">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{collection.scenarios.length} Senaryo</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(collection.createdAt).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {collection.scenarios.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Bu koleksiyon boş</h3>
              <p className="text-foreground-muted mb-6">
                Henüz bu koleksiyona senaryo eklenmemiş
              </p>
              <Link href="/scenarios">
                <Button>Tüm Senaryoları Keşfet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-6">
              Bu Koleksiyondaki Senaryolar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collection.scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
