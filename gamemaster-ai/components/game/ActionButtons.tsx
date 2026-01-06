"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Dice6, MessageCircle, CheckCircle, Swords, Shield, Sparkles } from "lucide-react";
import type { GMAction, GMPrompt, DiceType } from "@/types";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  gmPrompt: GMPrompt;
  onActionSelect: (action: GMAction) => void;
  onDiceRoll?: (action: GMAction) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const actionIcons: Record<string, React.ElementType> = {
  dice_roll: Dice6,
  skill_check: Sparkles,
  saving_throw: Shield,
  attack_roll: Swords,
  choice: MessageCircle,
  confirm: CheckCircle,
  free_text: MessageCircle,
};

const actionColors: Record<string, string> = {
  dice_roll: "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20",
  skill_check: "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
  saving_throw: "bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20",
  attack_roll: "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20",
  choice: "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20",
  confirm: "bg-success/10 border-success/30 text-success hover:bg-success/20",
  free_text: "bg-muted/10 border-muted/30 text-muted hover:bg-muted/20",
};

export function ActionButtons({
  gmPrompt,
  onActionSelect,
  onDiceRoll,
  isLoading = false,
  disabled = false,
}: ActionButtonsProps) {
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
  const [clickedActionId, setClickedActionId] = useState<string | null>(null);

  if (!gmPrompt || !gmPrompt.actions || gmPrompt.actions.length === 0) {
    return null;
  }

  const handleActionClick = (action: GMAction) => {
    // Tıklama animasyonu
    setClickedActionId(action.id);
    
    // Zar atışı gerektiren aksiyonlar için özel handler
    const isDiceAction = ["dice_roll", "skill_check", "saving_throw", "attack_roll"].includes(action.type);
    
    // Kısa gecikme ile animasyonu göster
    setTimeout(() => {
      if (isDiceAction && onDiceRoll) {
        onDiceRoll(action);
      } else {
        onActionSelect(action);
      }
    }, 150);
  };

  // Zorunlu aksiyon varsa, sadece zorunlu olanlar tıklanabilir
  const hasMandatoryPrompt = gmPrompt.isMandatory;

  return (
    <div className="mt-3 space-y-2 animate-fade-in">
      {/* Prompt Text */}
      {gmPrompt.promptText && (
        <p className="text-sm text-foreground-muted flex items-center gap-2">
          <Dice6 className="h-4 w-4" />
          {gmPrompt.promptText}
          {gmPrompt.isMandatory && (
            <span className="text-xs text-warning font-medium">(Zorunlu)</span>
          )}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {gmPrompt.actions.map((action) => {
          const Icon = actionIcons[action.type] || MessageCircle;
          const colorClass = actionColors[action.type] || actionColors.choice;
          
          // Zorunlu prompt varsa, sadece isMandatory olan aksiyonlar aktif
          const isActionDisabled = disabled || isLoading || 
            (hasMandatoryPrompt && !action.isMandatory);

          return (
            <div 
              key={action.id} 
              className="relative"
              onMouseEnter={() => setHoveredActionId(action.id)}
              onMouseLeave={() => setHoveredActionId(null)}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isActionDisabled}
                className={cn(
                  "gap-2 transition-all duration-200 border",
                  colorClass,
                  action.isMandatory && "ring-2 ring-warning/50",
                  isActionDisabled && !disabled && !isLoading && "opacity-40 cursor-not-allowed",
                  clickedActionId === action.id && "scale-95 brightness-125"
                )}
              >
                <Icon className={cn("h-4 w-4", clickedActionId === action.id && "animate-spin")} />
                {action.label}
                {action.dc && (
                  <span className="text-xs opacity-70">(DC {action.dc})</span>
                )}
              </Button>
              
              {/* Hover Tooltip */}
              {action.description && hoveredActionId === action.id && (
                <div className="absolute bottom-full left-0 mb-2 z-20 w-64 p-2 rounded-lg bg-card border border-border shadow-lg text-xs text-foreground-secondary animate-fade-in">
                  {action.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export edilebilir helper fonksiyon - zar atışı sonucu oluşturur
export function rollDiceForAction(action: GMAction): {
  results: number[];
  total: number;
  modifier: number;
  success?: boolean;
} {
  const diceType = action.diceType || "d20";
  const diceCount = action.diceCount || 1;
  const modifier = action.modifier || 0;
  
  // Zar değerini parse et
  const maxValue = parseInt(diceType.replace("d", ""));
  
  // Zarları at
  const results: number[] = [];
  for (let i = 0; i < diceCount; i++) {
    results.push(Math.floor(Math.random() * maxValue) + 1);
  }
  
  // Toplamı hesapla
  const sum = results.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  
  // DC varsa başarı kontrolü
  const success = action.dc ? total >= action.dc : undefined;
  
  return { results, total, modifier, success };
}


