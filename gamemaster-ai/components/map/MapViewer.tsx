"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/security/imageUrl";
import { Map, Loader2, X, Maximize2, Trash2, Edit2, Check, XCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { GameMap } from "@/types";

interface MapViewerProps {
  map: GameMap | null;
  isLoading?: boolean;
  onClose?: () => void;
  onDelete?: (mapId: string) => Promise<void>;
  onUpdate?: (mapId: string, data: Partial<GameMap>) => Promise<void>;
  editable?: boolean;
  fillHeight?: boolean;
}

export function MapViewer({
  map,
  isLoading = false,
  onClose,
  onDelete,
  onUpdate,
  editable = false,
  fillHeight = false,
}: MapViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!map && !isLoading) {
    return null;
  }

  const safeMapImageUrl = normalizeImageUrl(map?.imageUrl);
  const mapName = map?.name || "Harita";
  const mapDescription = map?.description || "";

  const handleStartEdit = () => {
    if (map) {
      setEditName(map.name || "");
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!map || !onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(map.id, { name: editName });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const handleDelete = async () => {
    if (!map || !onDelete) return;
    if (!confirm("Bu haritayı silmek istediğinizden emin misiniz?")) return;
    setIsDeleting(true);
    try {
      await onDelete(map.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Compact view */}
      <div
        className={cn(
          "relative rounded-lg border border-border overflow-hidden transition-all duration-300 flex flex-col",
          fillHeight && "h-full",
          isLoading ? "bg-gradient-to-br from-emerald-900/80 via-teal-900/60 to-emerald-950/80" : "bg-card"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-background-secondary border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Map className="h-4 w-4 text-primary flex-shrink-0" />
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 text-sm"
                  placeholder="Harita adı"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCancelEdit}
                >
                  <XCircle className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ) : (
              <span className="text-sm font-medium text-foreground truncate">
                {isLoading ? "Harita oluşturuluyor..." : map?.name || "Harita"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {safeMapImageUrl && !imageError && !isLoading && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsExpanded(true)}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                {editable && onUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                {editable && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                )}
              </>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Image container */}
        <div
          className={cn(
            "relative w-full bg-gradient-to-br from-emerald-900/80 via-teal-900/60 to-emerald-950/80",
            fillHeight ? "flex-1 min-h-0" : "aspect-[16/9]"
          )}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-teal-300" />
                <span className="text-sm font-medium text-white/90 animate-pulse">
                  AI harita üretiyor...
                </span>
              </div>
            </div>
          ) : safeMapImageUrl && !imageError ? (
            <img
              src={safeMapImageUrl}
              alt={mapName}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsExpanded(true)}
              onError={() => setImageError(true)}
            />
          ) : imageError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-xs text-muted-foreground">
                Görsel yüklenemedi
              </span>
            </div>
          ) : null}
        </div>

        {/* Description */}
        {map?.description && !isLoading && (
          <div className="px-3 py-2 border-t border-border bg-background-secondary/50">
            <p className="text-xs text-foreground-muted line-clamp-2">{map.description}</p>
          </div>
        )}
      </div>

      {/* Expanded modal */}
      {isExpanded && safeMapImageUrl && !imageError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative max-w-full max-h-full bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 rounded-lg shadow-2xl overflow-hidden">
              <img
                src={safeMapImageUrl}
                alt={mapName}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {mapName}
                </span>
              </div>
              {mapDescription && (
                <p className="text-xs text-white/70 mt-1 max-w-xs">{mapDescription}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/70 hover:bg-black/90 text-white border border-white/20 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
