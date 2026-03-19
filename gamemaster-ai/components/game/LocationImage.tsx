"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/security/imageUrl";
import { MapPin, Loader2, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui";

interface LocationImageProps {
  imageUrl: string | null;
  locationName: string | null;
  isLoading?: boolean;
  onClose?: () => void;
  fillHeight?: boolean;
}

export function LocationImage({
  imageUrl,
  locationName,
  isLoading = false,
  onClose,
  fillHeight = false,
}: LocationImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const useFullHeight = fillHeight;
  const safeImageUrl = normalizeImageUrl(imageUrl);

  if (!safeImageUrl && !isLoading) {
    return null;
  }

  return (
    <>
      {/* Compact view */}
      <div
        className={cn(
          "relative rounded-lg border border-border overflow-hidden transition-all duration-300 flex flex-col max-w-2xl mx-auto",
          useFullHeight && "h-full",
          isLoading ? "bg-gradient-to-br from-indigo-900/80 via-violet-900/60 to-indigo-950/80" : "bg-card"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-background-secondary border-b border-border">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {isLoading ? "Görsel üretiliyor..." : locationName || "Mekan Görseli"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {safeImageUrl && !imageError && !isLoading && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
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
            "relative w-full bg-gradient-to-br from-indigo-900/80 via-violet-900/60 to-indigo-950/80",
            useFullHeight ? "flex-1 min-h-0" : "aspect-[16/9]"
          )}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-violet-300" />
                <span className="text-sm font-medium text-white/90 animate-pulse">
                  AI görsel üretiyor...
                </span>
              </div>
            </div>
          ) : safeImageUrl && !imageError ? (
            <Image
              src={safeImageUrl}
              alt={locationName || "Mekan görseli"}
              fill
              className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsExpanded(true)}
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : imageError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-xs text-muted-foreground">
                Görsel yüklenemedi
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Expanded modal */}
      {isExpanded && safeImageUrl && !imageError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative max-w-full max-h-full bg-gradient-to-br from-indigo-900 via-violet-900 to-indigo-950 rounded-lg shadow-2xl overflow-hidden">
              <Image
                src={safeImageUrl}
                alt={locationName || "Mekan görseli"}
                fill
                className="object-contain"
                onClick={(e) => e.stopPropagation()}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {locationName}
                </span>
              </div>
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
