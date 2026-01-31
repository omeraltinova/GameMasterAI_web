"use client";

import { useEffect, useState } from "react";
import { X, Map, MapPin, Globe, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui";
import { MapGallery } from "./MapGallery";
import { MapGenerator } from "./MapGenerator";
import type { GameMap } from "@/types";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  maps: GameMap[];
  isLoading?: boolean;
  currentLocation?: string | null;
  currentLocationType?: string | null;
  worldName?: string | null;
  onMapCreated?: (map: GameMap) => void;
  onMapDelete?: (mapId: string) => Promise<void>;
  onMapUpdate?: (mapId: string, data: Partial<GameMap>) => Promise<void>;
  onRefresh?: () => void;
}

export function MapModal({
  isOpen,
  onClose,
  sessionId,
  maps,
  isLoading = false,
  currentLocation,
  currentLocationType,
  worldName,
  onMapCreated,
  onMapDelete,
  onMapUpdate,
  onRefresh,
}: MapModalProps) {
  const [isGeneratingQuick, setIsGeneratingQuick] = useState<'location' | 'world' | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Fetch maps when modal opens
  useEffect(() => {
    if (isOpen && onRefresh) {
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  // Reset error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuickError(null);
      setIsGeneratingQuick(null);
    }
  }, [isOpen]);

  // Tek tuşla harita oluşturma
  const handleQuickGenerate = async (type: 'location' | 'world') => {
    setIsGeneratingQuick(type);
    setQuickError(null);

    try {
      const payload = type === 'location' 
        ? {
            sessionId,
            locationName: currentLocation || 'Mevcut Mekan',
            locationType: currentLocationType || 'other',
            mapStyle: 'topdown',
            atmosphere: 'mysterious',
          }
        : {
            sessionId,
            locationName: worldName || 'Dünya Haritası',
            locationType: 'other',
            mapStyle: 'region',
            atmosphere: 'mysterious',
          };

      const response = await fetch("/api/gm/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Harita oluşturulamadı");
      }

      onMapCreated?.(data.map);
      onRefresh?.();
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setIsGeneratingQuick(null);
    }
  };

  if (!isOpen) return null;

  const isGenerating = isGeneratingQuick !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-card border border-border rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Haritalar</h2>
              <p className="text-sm text-foreground-muted">
                {currentLocation 
                  ? `Mevcut mekan: ${currentLocation}` 
                  : "Oyun haritalarını görüntüle ve yeni haritalar oluştur"
                }
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Mevcut Mekan Haritası */}
            <button
              onClick={() => handleQuickGenerate('location')}
              disabled={isGenerating || !currentLocation}
              className="relative p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                  {isGeneratingQuick === 'location' ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <MapPin className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Mekan Haritası</p>
                  <p className="text-xs text-foreground-muted mt-0.5 truncate">
                    {currentLocation || 'Mevcut mekan yok'}
                  </p>
                </div>
              </div>
              {isGeneratingQuick === 'location' && (
                <div className="absolute inset-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </div>
                </div>
              )}
            </button>

            {/* Dünya/Bölge Haritası */}
            <button
              onClick={() => handleQuickGenerate('world')}
              disabled={isGenerating}
              className="relative p-4 rounded-xl border-2 border-dashed border-secondary/30 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/30 transition-colors">
                  {isGeneratingQuick === 'world' ? (
                    <Loader2 className="h-5 w-5 text-secondary animate-spin" />
                  ) : (
                    <Globe className="h-5 w-5 text-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Bölge Haritası</p>
                  <p className="text-xs text-foreground-muted mt-0.5 truncate">
                    {worldName || 'Genel dünya haritası'}
                  </p>
                </div>
              </div>
              {isGeneratingQuick === 'world' && (
                <div className="absolute inset-0 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-secondary text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </div>
                </div>
              )}
            </button>

            {/* Özel Harita - MapGenerator'ı açar */}
            <MapGenerator
              sessionId={sessionId}
              onMapCreated={onMapCreated}
              currentLocation={currentLocation}
              currentLocationType={currentLocationType}
              className="h-full"
              triggerClassName="h-full w-full p-4 rounded-xl border-2 border-dashed border-foreground-muted/30 bg-background-elevated hover:bg-border/50 hover:border-foreground-muted/50 transition-all text-left group"
              customTrigger={
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground-muted/20 flex items-center justify-center flex-shrink-0 group-hover:bg-foreground-muted/30 transition-colors">
                    <Wand2 className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Özel Harita</p>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Detaylı ayarlarla oluştur
                    </p>
                  </div>
                </div>
              }
            />
          </div>

          {/* Error message */}
          {quickError && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              {quickError}
            </div>
          )}

          {/* Maps gallery */}
          <MapGallery
            maps={maps}
            isLoading={isLoading}
            onDelete={onMapDelete}
            onUpdate={onMapUpdate}
            editable
            emptyMessage="Henüz harita oluşturulmamış. Yukarıdaki seçeneklerden birini kullanarak harita oluşturabilirsin."
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background-secondary/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-muted">
              {maps.length} harita
            </p>
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
