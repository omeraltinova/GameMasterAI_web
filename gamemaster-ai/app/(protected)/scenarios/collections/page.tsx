"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { Sparkles, Loader2, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

interface Collection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  scenarios: Scenario[];
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/scenarios/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error("Koleksiyonlar yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Senaryolara Dön
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Senaryo Koleksiyonları</h1>
              <p className="text-foreground-muted">
                Önceden hazırlanmış senaryo paketleri
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-foreground-muted">Yükleniyor...</p>
            </div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Henüz koleksiyon yok</h3>
            <p className="text-foreground-muted mb-6">
              Yöneticiler tarafından hazırlanan koleksiyonlar burada görünecek
            </p>
            <Link href="/scenarios">
              <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Senaryoları Keşfet
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/scenarios/collections/${collection.id}`}>
                  <CardContent className="p-0">
                    <div className="p-6 border-b border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h2 className="text-xl font-bold mb-1">
                            {collection.name}
                          </h2>
                          {collection.description && (
                            <p className="text-sm text-foreground-muted line-clamp-2">
                              {collection.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            {collection.scenarios.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {collection.scenarios.length > 0 && (
                      <div className="p-6 bg-muted/30">
                        <p className="text-xs font-medium text-foreground-muted mb-3">
                          İçerideki Senaryolar
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {collection.scenarios.slice(0, 4).map((scenario) => (
                            <ScenarioCard
                              key={scenario.id}
                              scenario={scenario}
                            />
                          ))}
                        </div>
                        {collection.scenarios.length > 4 && (
                          <p className="text-xs text-foreground-muted mt-3">
                            +{collection.scenarios.length - 4} daha fazla senaryo
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
