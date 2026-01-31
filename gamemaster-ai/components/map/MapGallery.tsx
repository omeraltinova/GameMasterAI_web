"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Map, Loader2, Trash2, Eye, Calendar, Sparkles, Grid, List } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { MapViewer } from "./MapViewer";
import type { GameMap } from "@/types";

interface MapGalleryProps {
  maps: GameMap[];
  isLoading?: boolean;
  onDelete?: (mapId: string) => Promise<void>;
  onUpdate?: (mapId: string, data: Partial<GameMap>) => Promise<void>;
  onSelect?: (map: GameMap) => void;
  editable?: boolean;
  className?: string;
  emptyMessage?: string;
}

type ViewMode = "grid" | "list";

export function MapGallery({
  maps,
  isLoading = false,
  onDelete,
  onUpdate,
  onSelect,
  editable = false,
  className,
  emptyMessage = "Henüz harita yok",
}: MapGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedMap, setSelectedMap] = useState<GameMap | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleMapClick = (map: GameMap) => {
    if (onSelect) {
      onSelect(map);
    } else {
      setSelectedMap(map);
    }
  };

  const handleDelete = async (mapId: string) => {
    if (!onDelete) return;
    if (!confirm("Bu haritayı silmek istediğinizden emin misiniz?")) return;
    setDeletingId(mapId);
    try {
      await onDelete(mapId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewerDelete = async (mapId: string) => {
    if (!onDelete) return;
    await onDelete(mapId);
    setSelectedMap(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-foreground-muted">Haritalar yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Map className="h-12 w-12 text-foreground-muted/30 mb-4" />
        <p className="text-foreground-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <span className="font-medium">Haritalar</span>
          <Badge variant="secondary" size="sm">{maps.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "primary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "primary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Maps grid/list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <Card
              key={map.id}
              className="group cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
              onClick={() => handleMapClick(map)}
            >
              {/* Image */}
              <div className="relative aspect-video bg-gradient-to-br from-emerald-900/60 via-teal-900/40 to-emerald-950/60">
                {map.imageUrl ? (
                  <img
                    src={map.imageUrl}
                    alt={map.name || "Harita"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Map className="h-12 w-12 text-white/20" />
                  </div>
                )}
                
                {/* AI badge */}
                {map.isAIGenerated && (
                  <Badge 
                    variant="primary" 
                    size="sm" 
                    className="absolute top-2 left-2 gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI
                  </Badge>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>

              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{map.name || "İsimsiz Harita"}</h4>
                    {map.description && (
                      <p className="text-xs text-foreground-muted truncate mt-0.5">
                        {map.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-foreground-muted mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(map.createdAt)}
                    </div>
                  </div>
                  
                  {editable && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(map.id);
                      }}
                      disabled={deletingId === map.id}
                    >
                      {deletingId === map.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {maps.map((map) => (
            <div
              key={map.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-background-elevated hover:bg-border/50 cursor-pointer transition-colors group"
              onClick={() => handleMapClick(map)}
            >
              {/* Thumbnail */}
              <div className="relative w-20 h-14 rounded-md overflow-hidden bg-gradient-to-br from-emerald-900/60 via-teal-900/40 to-emerald-950/60 flex-shrink-0">
                {map.imageUrl ? (
                  <img
                    src={map.imageUrl}
                    alt={map.name || "Harita"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Map className="h-6 w-6 text-white/20" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{map.name || "İsimsiz Harita"}</h4>
                  {map.isAIGenerated && (
                    <Badge variant="primary" size="sm" className="gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI
                    </Badge>
                  )}
                </div>
                {map.description && (
                  <p className="text-xs text-foreground-muted truncate mt-0.5">
                    {map.description}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-foreground-muted">
                <Calendar className="h-3 w-3" />
                {formatDate(map.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMapClick(map);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {editable && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(map.id);
                    }}
                    disabled={deletingId === map.id}
                  >
                    {deletingId === map.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map viewer modal */}
      {selectedMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl">
            <MapViewer
              map={selectedMap}
              onClose={() => setSelectedMap(null)}
              onDelete={editable ? handleViewerDelete : undefined}
              onUpdate={editable ? onUpdate : undefined}
              editable={editable}
            />
          </div>
        </div>
      )}
    </div>
  );
}
