"use client";

import { useState } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { mockScenarios } from "@/lib/mock-data";
import { Plus, Map, Search, Sparkles, BookOpen, Filter } from "lucide-react";

const difficultyColors = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
} as const;

export default function ScenariosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("");

  const genres = [...new Set(mockScenarios.map((s) => s.genre))];

  const filterScenarios = (scenarios: typeof mockScenarios) =>
    scenarios.filter(
      (s) =>
        (s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (!genreFilter || s.genre === genreFilter)
    );

  const officialScenarios = mockScenarios.filter((s) => s.isOfficial);
  const communityScenarios = mockScenarios.filter((s) => !s.isOfficial);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Senaryolar</h1>
          <p className="text-foreground-secondary">
            {mockScenarios.length} senaryo
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Senaryo
        </Button>
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
          {genres.map((genre) => (
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

      {/* Tabs */}
      <Tabs defaultValue="official">
        <TabsList>
          <TabsTrigger value="official">
            <BookOpen className="h-4 w-4 mr-2" />
            Resmi
            <Badge variant="primary" size="sm" className="ml-2">
              {officialScenarios.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="community">
            <Sparkles className="h-4 w-4 mr-2" />
            Topluluk
            <Badge variant="secondary" size="sm" className="ml-2">
              {communityScenarios.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Official Scenarios */}
        <TabsContent value="official">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterScenarios(officialScenarios).map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </TabsContent>

        {/* Community Scenarios */}
        <TabsContent value="community">
          {filterScenarios(communityScenarios).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterScenarios(communityScenarios).map((scenario) => (
                <ScenarioCard key={scenario.id} scenario={scenario} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Sparkles className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Topluluk senaryosu bulunamadı
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  İlk topluluk senaryosunu oluşturan sen ol!
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Senaryo Oluştur
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: (typeof mockScenarios)[0] }) {
  return (
    <Card hover className="h-full group">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 rounded-t-xl flex items-center justify-center">
        <Map className="h-12 w-12 text-primary/50 group-hover:scale-110 transition-transform" />
        <div className="absolute top-3 right-3 flex gap-2">
          {scenario.isOfficial && (
            <Badge variant="primary" size="sm">
              Resmi
            </Badge>
          )}
          {scenario.isAIGenerated && (
            <Badge variant="secondary" size="sm">
              AI
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="pt-4">
        {/* Title */}
        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
          {scenario.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-foreground-secondary line-clamp-3 mb-4">
          {scenario.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">{scenario.genre}</Badge>
          <Badge
            variant={difficultyColors[scenario.difficulty as keyof typeof difficultyColors]}
          >
            {scenario.difficulty}
          </Badge>
        </div>

        {/* Tags */}
        {scenario.tags && scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scenario.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-background-elevated text-foreground-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


