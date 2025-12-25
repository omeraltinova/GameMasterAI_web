"use client";

import { useState } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { mockScenarios } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Map, Search, Check, X, MoreVertical, Star, Trash2, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";

const difficultyColors = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
} as const;

export default function AdminScenariosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "official" | "community">("all");

  const filteredScenarios = mockScenarios.filter(
    (scenario) =>
      (scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filter === "all" ||
        (filter === "official" && scenario.isOfficial) ||
        (filter === "community" && !scenario.isOfficial))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Senaryo Yönetimi</h1>
          <p className="text-foreground-secondary">
            {mockScenarios.length} senaryo
          </p>
        </div>
        <Button className="gap-2">
          <Map className="h-4 w-4" />
          Resmi Senaryo Ekle
        </Button>
      </div>

      {/* Filters */}
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
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tümü
          </Button>
          <Button
            variant={filter === "official" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("official")}
          >
            Resmi
          </Button>
          <Button
            variant={filter === "community" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("community")}
          >
            Topluluk
          </Button>
        </div>
      </div>

      {/* Scenarios Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-secondary">
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Senaryo
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Tür
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Zorluk
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Durum
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Oluşturulma
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-foreground-secondary">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredScenarios.map((scenario) => (
                  <tr
                    key={scenario.id}
                    className="border-b border-border hover:bg-background-elevated transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Map className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{scenario.title}</p>
                          <p className="text-sm text-foreground-muted line-clamp-1 max-w-xs">
                            {scenario.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline">{scenario.genre}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={difficultyColors[scenario.difficulty as keyof typeof difficultyColors]}>
                        {scenario.difficulty}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {scenario.isOfficial ? (
                          <Badge variant="primary">
                            <Star className="h-3 w-3 mr-1" />
                            Resmi
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Topluluk</Badge>
                        )}
                        {scenario.isAIGenerated && (
                          <Badge variant="outline">AI</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-foreground-secondary">
                      {formatDate(scenario.createdAt)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Görüntüle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              {scenario.isOfficial ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Resmi Olmaktan Çıkar
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Resmi Yap
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-danger">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredScenarios.length === 0 && (
            <div className="py-12 text-center">
              <Map className="h-12 w-12 text-foreground-muted mx-auto mb-4" />
              <p className="text-foreground-secondary">Senaryo bulunamadı</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


