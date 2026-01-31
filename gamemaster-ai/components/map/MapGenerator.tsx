"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Map, 
  Loader2, 
  Sparkles, 
  Plus, 
  Wand2,
  Mountain,
  TreeDeciduous,
  Castle,
  Home,
  Anchor,
  Tent,
  Skull,
  Church,
  MapPin,
  Eye,
  Globe,
  Compass,
  Building,
} from "lucide-react";
import { Button, Input, Textarea, Badge, Modal } from "@/components/ui";
import { MapViewer } from "./MapViewer";
import type { GameMap, MapType } from "@/types";

interface MapGeneratorProps {
  sessionId: string;
  onMapCreated?: (map: GameMap) => void;
  currentLocation?: string | null;
  currentLocationType?: string | null;
  className?: string;
  triggerClassName?: string;
  customTrigger?: React.ReactNode;
}

// Lokasyon tipleri
const LOCATION_TYPES: { value: MapType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "dungeon", label: "Zindan", icon: Skull },
  { value: "tavern", label: "Taverna", icon: Home },
  { value: "forest", label: "Orman", icon: TreeDeciduous },
  { value: "cave", label: "Mağara", icon: Mountain },
  { value: "castle", label: "Kale", icon: Castle },
  { value: "town", label: "Kasaba", icon: Home },
  { value: "port", label: "Liman", icon: Anchor },
  { value: "camp", label: "Kamp", icon: Tent },
  { value: "temple", label: "Tapınak", icon: Church },
  { value: "battlefield", label: "Savaş Alanı", icon: Skull },
  { value: "mountain", label: "Dağ", icon: Mountain },
  { value: "other", label: "Diğer", icon: Map },
];

// Harita stilleri
const MAP_STYLES = [
  { value: "topdown", label: "Tepeden Bakış", icon: Eye, description: "Kuşbakışı detaylı harita" },
  { value: "region", label: "Bölge Haritası", icon: Globe, description: "Geniş alan, birden fazla lokasyon" },
  { value: "city", label: "Şehir Planı", icon: Building, description: "Sokaklar, binalar, meydanlar" },
  { value: "dungeon", label: "Zindan Haritası", icon: Compass, description: "Odalar, koridorlar, tuzaklar" },
  { value: "battle", label: "Savaş Haritası", icon: MapPin, description: "Grid tabanlı, taktik harita" },
];

// Atmosfer seçenekleri
const ATMOSPHERES = [
  { value: "mysterious", label: "Gizemli" },
  { value: "dark", label: "Karanlık" },
  { value: "peaceful", label: "Huzurlu" },
  { value: "dangerous", label: "Tehlikeli" },
  { value: "ancient", label: "Antik" },
  { value: "magical", label: "Büyülü" },
  { value: "abandoned", label: "Terk Edilmiş" },
  { value: "lively", label: "Canlı" },
  { value: "eerie", label: "Ürkütücü" },
  { value: "sacred", label: "Kutsal" },
];

export function MapGenerator({
  sessionId,
  onMapCreated,
  currentLocation,
  currentLocationType,
  className,
  triggerClassName,
  customTrigger,
}: MapGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMap, setGeneratedMap] = useState<GameMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<MapType>("town");
  const [mapStyle, setMapStyle] = useState("topdown");
  const [atmosphere, setAtmosphere] = useState("mysterious");
  const [details, setDetails] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Mevcut lokasyonu kullan
  useEffect(() => {
    if (useCurrentLocation && currentLocation) {
      setLocationName(currentLocation);
      if (currentLocationType) {
        const matchedType = LOCATION_TYPES.find(t => 
          t.value === currentLocationType || 
          t.label.toLowerCase() === currentLocationType.toLowerCase()
        );
        if (matchedType) {
          setLocationType(matchedType.value);
        }
      }
    }
  }, [useCurrentLocation, currentLocation, currentLocationType]);

  const resetForm = () => {
    setLocationName("");
    setLocationType("town");
    setMapStyle("topdown");
    setAtmosphere("mysterious");
    setDetails("");
    setError(null);
    setGeneratedMap(null);
    setUseCurrentLocation(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setUseCurrentLocation(true);
      setLocationName(currentLocation);
    }
  };

  const handleGenerate = async () => {
    if (!locationName.trim()) {
      setError("Lokasyon adı gerekli");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const detailsArray = details
        .split("\n")
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const response = await fetch("/api/gm/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          locationName: locationName.trim(),
          locationType,
          mapStyle,
          atmosphere,
          details: detailsArray.length > 0 ? detailsArray : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Harita oluşturulamadı");
      }

      setGeneratedMap(data.map);
      onMapCreated?.(data.map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateAnother = () => {
    setGeneratedMap(null);
    setLocationName("");
    setDetails("");
    setUseCurrentLocation(false);
  };

  return (
    <>
      {/* Trigger button */}
      {customTrigger ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(triggerClassName, className)}
        >
          {customTrigger}
        </button>
      ) : (
        <Button
          variant="primary"
          onClick={() => setIsOpen(true)}
          className={cn("gap-2", className)}
        >
          <Wand2 className="h-4 w-4" />
          Harita Oluştur
        </Button>
      )}

      {/* Generator modal */}
      <Modal
        open={isOpen}
        onOpenChange={(open) => !open && handleClose()}
        title={generatedMap ? "Harita Oluşturuldu" : "AI Harita Oluşturucu"}
        size="lg"
      >
        {generatedMap ? (
          // Show generated map
          <div className="space-y-4">
            <MapViewer map={generatedMap} />
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                Kapat
              </Button>
              <Button variant="primary" onClick={handleCreateAnother} className="gap-2">
                <Plus className="h-4 w-4" />
                Yeni Harita Oluştur
              </Button>
            </div>
          </div>
        ) : (
          // Generator form
          <div className="space-y-6">
            {/* Current location quick action */}
            {currentLocation && !useCurrentLocation && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mevcut Mekan</p>
                      <p className="text-xs text-foreground-muted">{currentLocation}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Bu Mekanın Haritasını Oluştur
                  </Button>
                </div>
              </div>
            )}

            {/* Location name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Lokasyon Adı <span className="text-danger">*</span>
              </label>
              <Input
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  if (useCurrentLocation && e.target.value !== currentLocation) {
                    setUseCurrentLocation(false);
                  }
                }}
                placeholder="örn: Karanlık Orman, Ejderha Mağarası..."
                disabled={isGenerating}
              />
            </div>

            {/* Map style */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Harita Stili</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {MAP_STYLES.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setMapStyle(style.value)}
                      disabled={isGenerating}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center",
                        mapStyle === style.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-foreground-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{style.label}</span>
                      <span className="text-[10px] text-foreground-muted leading-tight hidden sm:block">
                        {style.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lokasyon Tipi</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {LOCATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setLocationType(type.value)}
                      disabled={isGenerating}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                        locationType === type.value
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border hover:border-foreground-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px]">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atmosphere */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Atmosfer</label>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERES.map((atm) => (
                  <Badge
                    key={atm.value}
                    variant={atmosphere === atm.value ? "primary" : "secondary"}
                    className={cn(
                      "cursor-pointer transition-all",
                      atmosphere === atm.value && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                    onClick={() => !isGenerating && setAtmosphere(atm.value)}
                  >
                    {atm.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Detaylar <span className="text-foreground-muted">(her satıra bir özellik)</span>
              </label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  mapStyle === "city" 
                    ? "Ana meydan\nPazar alanı\nKale duvarları\nLiman bölgesi" 
                    : mapStyle === "region"
                    ? "Kuzey ormanları\nGüney çölleri\nNehir sistemi\nDağ sırası"
                    : mapStyle === "dungeon"
                    ? "Giriş salonu\nTuzak odası\nHazine odası\nBoss odası"
                    : "Merkeze bir hazine sandığı\nDuvarlarda meşaleler\nZeminde su birikintileri"
                }
                rows={4}
                disabled={isGenerating}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                İptal
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !locationName.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Harita Oluştur
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
