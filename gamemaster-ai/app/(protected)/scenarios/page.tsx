"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { Plus, Search, Sparkles, BookOpen, Map, Loader2, LayoutGrid, Hash } from "lucide-react";
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

export default function ScenariosPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [officialScenarios, setOfficialScenarios] = useState<Scenario[]>([]);
  const [myScenarios, setMyScenarios] = useState<Scenario[]>([]);
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = "/api/scenarios";
        if (activeTab === "official") {
          url = "/api/scenarios/official";
        } else if (activeTab === "mine") {
          url = "/api/scenarios/mine";
        }
        
        // Append query params
        const params = new URLSearchParams();
        if (searchQuery) params.append("query", searchQuery);
        if (genreFilter) params.append("genre", genreFilter);
        
        if (activeTab === "community") {
           // For community, we fetch all and filter client side or use a specific endpoint param.
           // Current API structure: /api/scenarios returns all. We can filter !isOfficial
           const res = await fetch(`/api/scenarios?${params.toString()}`);
           const data = await res.json();
           if (data.data) {
             setAllScenarios(data.data.filter((s: Scenario) => !s.isOfficial));
           }
        } else if (activeTab === "all") {
           const res = await fetch(`/api/scenarios?${params.toString()}`);
           const data = await res.json();
           const scenarios = Array.isArray(data) ? data : data.data || [];
           setAllScenarios(scenarios);
        } else {
           const res = await fetch(`${url}?${params.toString()}`);
           const data = await res.json();
           // Handle both array response and paginated response { data: [] }
           const scenarios = Array.isArray(data) ? data : data.data || [];
           
           if (activeTab === "official") setOfficialScenarios(scenarios);
           if (activeTab === "mine") setMyScenarios(scenarios);
        }

      } catch (error) {
        console.error("Failed to fetch scenarios:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, genreFilter]);


  // Aktif sekmeye göre baz senaryoları belirle
  const baseScenarios = 
    activeTab === "all" ? allScenarios :
    activeTab === "official" ? officialScenarios :
    activeTab === "mine" ? myScenarios :
    allScenarios;

  // Tag parse yardımcı fonksiyonu
  const parseTags = (tags: any): string[] => {
    const parsed = typeof tags === "string" ? JSON.parse(tags) : tags;
    return Array.isArray(parsed) ? parsed : [];
  };

  // Mevcut senaryolardan benzersiz tag'leri topla
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    baseScenarios.forEach((s) => {
      parseTags(s.tags).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [baseScenarios]);

  // Tag filtresi uygulanmış senaryolar
  const displayedScenarios = useMemo(() => {
    if (!tagFilter) return baseScenarios;
    return baseScenarios.filter((s) => parseTags(s.tags).includes(tagFilter));
  }, [baseScenarios, tagFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Senaryolar</h1>
          <p className="text-foreground-secondary">
            Yeni maceralar keşfet veya kendi hikayeni yarat
          </p>
        </div>
        <Link href="/scenarios/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Senaryo
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Senaryo ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!genreFilter ? "primary" : "outline"}
            size="sm"
            onClick={() => setGenreFilter("")}
          >
            Tümü
          </Button>
          {["Fantasy", "Sci-Fi", "Horror", "Mystery", "Cyberpunk"].map((genre) => (
            <Button
              key={genre}
              variant={genreFilter === genre ? "primary" : "outline"}
              size="sm"
              onClick={() => setGenreFilter(genre)}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Hash className="h-4 w-4 text-foreground-muted shrink-0" />
          <Button
            variant={!tagFilter ? "primary" : "outline"}
            size="sm"
            onClick={() => setTagFilter("")}
          >
            Tümü
          </Button>
          {availableTags.map((tag) => (
            <Button
              key={tag}
              variant={tagFilter === tag ? "primary" : "outline"}
              size="sm"
              onClick={() => setTagFilter(tag)}
            >
              #{tag}
            </Button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setTagFilter(""); }}>
        <TabsList>
          <TabsTrigger value="all">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Tümü
          </TabsTrigger>
          <TabsTrigger value="official">
            <BookOpen className="h-4 w-4 mr-2" />
            Resmi
          </TabsTrigger>
          <TabsTrigger value="community">
            <Sparkles className="h-4 w-4 mr-2" />
            Topluluk
          </TabsTrigger>
           <TabsTrigger value="mine">
            <Map className="h-4 w-4 mr-2" />
            Senaryolarım
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {loading ? (
             <div className="flex justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : displayedScenarios.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedScenarios.map((scenario) => (
                <div key={scenario.id} onClick={() => router.push(`/scenarios/${scenario.id}`)}>
                   <ScenarioCard scenario={scenario} />
                </div>
              ))}
            </div>
          ) : (
             <Card>
              <CardContent className="py-16 text-center">
                <Sparkles className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Senaryo bulunamadı
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  {activeTab === "mine" 
                    ? "Henüz bir senaryo oluşturmadın." 
                    : "Aradığın kriterlere uygun senaryo bulunamadı."}
                </p>
                <Link href="/scenarios/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Senaryo Oluştur
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  );
}


