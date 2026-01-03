"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Suggestion } from "@/hooks/useGame";

interface ActionSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSelect: (detailedAction: string) => void;
  disabled?: boolean;
}

export function ActionSuggestions({
  suggestions,
  isLoading,
  onSelect,
  disabled = false,
}: ActionSuggestionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 text-sm text-foreground-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Öneriler hazırlanıyor...</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-background-secondary/50">
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground-secondary">
            Önerilen Aksiyonlar
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => {
            const isExpanded = expandedId === suggestion.id;
            
            return (
              <div key={suggestion.id} className="relative">
                <button
                  onClick={() => {
                    if (isExpanded) {
                      // Zaten açıksa, aksiyonu gönder
                      onSelect(suggestion.detailedAction);
                      setExpandedId(null);
                    } else {
                      // Kapalıysa, detayı göster
                      setExpandedId(suggestion.id);
                    }
                  }}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                    "border transition-all duration-200",
                    isExpanded
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-background border-border hover:border-primary/50 hover:bg-primary/5",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>{suggestion.shortLabel}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  )}
                </button>
                
                {/* Expanded detail tooltip */}
                {isExpanded && (
                  <div className="absolute bottom-full left-0 mb-2 z-10 w-64 p-3 rounded-lg bg-card border border-border shadow-lg animate-fade-in">
                    <p className="text-sm text-foreground mb-2">
                      {suggestion.detailedAction}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      Göndermek için tekrar tıkla
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Dışarı tıklama için overlay */}
        {expandedId && (
          <div 
            className="fixed inset-0 z-0" 
            onClick={() => setExpandedId(null)}
          />
        )}
      </div>
    </div>
  );
}
