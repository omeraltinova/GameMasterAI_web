"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Sparkles, AlertTriangle } from "lucide-react";
import type { DiceType } from "@/types";

type RollMode = 'normal' | 'advantage' | 'disadvantage';

interface DiceRollerProps {
  onRoll?: (diceType: DiceType, count: number, modifier: number, result: number[], rollMode?: RollMode) => void;
}

const diceOptions: { type: DiceType; label: string; max: number }[] = [
  { type: "d4", label: "D4", max: 4 },
  { type: "d6", label: "D6", max: 6 },
  { type: "d8", label: "D8", max: 8 },
  { type: "d10", label: "D10", max: 10 },
  { type: "d12", label: "D12", max: 12 },
  { type: "d20", label: "D20", max: 20 },
  { type: "d100", label: "D100", max: 100 },
];

export function DiceRoller({ onRoll }: DiceRollerProps) {
  const [selectedDice, setSelectedDice] = useState<DiceType>("d20");
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<{
    dice: DiceType;
    results: number[];
    modifier: number;
    total: number;
    rollMode: RollMode;
  } | null>(null);

  const rollDice = () => {
    setIsRolling(true);

    // Simulate rolling animation
    setTimeout(() => {
      const diceMax = diceOptions.find((d) => d.type === selectedDice)?.max || 20;
      const results: number[] = [];
      let total = 0;

      // Advantage/Disadvantage için d20 ve tek zar kontrolü
      if (selectedDice === 'd20' && count === 1 && rollMode !== 'normal') {
        // 2 kez at
        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        results.push(roll1, roll2);

        const chosenRoll = rollMode === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
        total = chosenRoll + modifier;
      } else {
        // Normal atış
        for (let i = 0; i < count; i++) {
          results.push(Math.floor(Math.random() * diceMax) + 1);
        }
        total = results.reduce((a, b) => a + b, 0) + modifier;
      }

      setLastResult({
        dice: selectedDice,
        results,
        modifier,
        total,
        rollMode: selectedDice === 'd20' && count === 1 ? rollMode : 'normal',
      });

      onRoll?.(selectedDice, count, modifier, results, rollMode);
      setIsRolling(false);
    }, 500);
  };

  // Get the effective roll for advantage/disadvantage
  const getEffectiveRoll = () => {
    if (!lastResult || lastResult.rollMode === 'normal' || lastResult.results.length < 2) {
      return lastResult?.results[0];
    }
    return lastResult.rollMode === 'advantage'
      ? Math.max(lastResult.results[0], lastResult.results[1])
      : Math.min(lastResult.results[0], lastResult.results[1]);
  };

  const effectiveRoll = getEffectiveRoll();
  const isCritical = selectedDice === "d20" && effectiveRoll === 20;
  const isCriticalFail = selectedDice === "d20" && effectiveRoll === 1;

  return (
    <div className="space-y-4">
      {/* Dice Selection */}
      <div className="flex flex-wrap gap-2">
        {diceOptions.map((dice) => (
          <button
            key={dice.type}
            onClick={() => setSelectedDice(dice.type)}
            className={cn(
              "px-3 py-2 rounded-lg font-mono text-sm font-bold transition-all",
              selectedDice === dice.type
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-background-elevated hover:bg-border text-foreground-secondary"
            )}
          >
            {dice.label}
          </button>
        ))}
      </div>

      {/* Count and Modifier */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-foreground-muted mb-1 block">Adet</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="p-2 rounded-lg bg-background-elevated hover:bg-border"
            >
              -
            </button>
            <span className="w-8 text-center font-bold">{count}</span>
            <button
              onClick={() => setCount(Math.min(10, count + 1))}
              className="p-2 rounded-lg bg-background-elevated hover:bg-border"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="text-xs text-foreground-muted mb-1 block">Modifier</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModifier(modifier - 1)}
              className="p-2 rounded-lg bg-background-elevated hover:bg-border"
            >
              -
            </button>
            <span className="w-8 text-center font-bold">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier(modifier + 1)}
              className="p-2 rounded-lg bg-background-elevated hover:bg-border"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Advantage/Disadvantage - only for d20 with count=1 */}
      {selectedDice === 'd20' && count === 1 && (
        <div>
          <label className="text-xs text-foreground-muted mb-1 block">Atış Modu</label>
          <div className="flex gap-2">
            <button
              onClick={() => setRollMode('normal')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                rollMode === 'normal'
                  ? "bg-primary text-primary-foreground"
                  : "bg-background-elevated hover:bg-border text-foreground-secondary"
              )}
            >
              Normal
            </button>
            <button
              onClick={() => setRollMode('advantage')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                rollMode === 'advantage'
                  ? "bg-success text-success-foreground"
                  : "bg-background-elevated hover:bg-border text-foreground-secondary"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Avantaj
            </button>
            <button
              onClick={() => setRollMode('disadvantage')}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                rollMode === 'disadvantage'
                  ? "bg-warning text-warning-foreground"
                  : "bg-background-elevated hover:bg-border text-foreground-secondary"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Dezavantaj
            </button>
          </div>
        </div>
      )}

      {/* Roll Button */}
      <Button
        onClick={rollDice}
        disabled={isRolling}
        className="w-full gap-2"
        size="lg"
      >
        <Dice6 className={cn("h-5 w-5", isRolling && "animate-spin")} />
        {isRolling ? "Atılıyor..." : `${count}${selectedDice} At`}
        {modifier !== 0 && (
          <span className="text-primary-foreground/80">
            {modifier >= 0 ? `+${modifier}` : modifier}
          </span>
        )}
      </Button>

      {/* Result */}
      {lastResult && (
        <div
          className={cn(
            "p-4 rounded-lg text-center animate-slide-up",
            isCritical
              ? "bg-success/20 border border-success"
              : isCriticalFail
                ? "bg-danger/20 border border-danger"
                : "bg-background-elevated"
          )}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {lastResult.rollMode !== 'normal' && lastResult.results.length === 2 ? (
              // Advantage/Disadvantage display
              <>
                {lastResult.results.map((r, i) => {
                  const isChosen = lastResult.rollMode === 'advantage'
                    ? r === Math.max(lastResult.results[0], lastResult.results[1])
                    : r === Math.min(lastResult.results[0], lastResult.results[1]);
                  // Handle both rolls being the same
                  const shouldHighlight = isChosen && (i === 0 || lastResult.results[0] !== lastResult.results[1]);

                  return (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center justify-center w-10 h-10 rounded-lg font-mono font-bold text-lg transition-all",
                        shouldHighlight
                          ? r === 20
                            ? "bg-success text-success-foreground ring-2 ring-success"
                            : r === 1
                              ? "bg-danger text-danger-foreground ring-2 ring-danger"
                              : "bg-primary text-primary-foreground ring-2 ring-primary"
                          : "bg-background-elevated text-foreground-muted opacity-50 line-through"
                      )}
                    >
                      {r}
                    </span>
                  );
                })}
                <span className="text-xs text-foreground-muted">
                  {lastResult.rollMode === 'advantage' ? '✨' : '⚠️'}
                </span>
              </>
            ) : (
              // Normal roll display
              lastResult.results.map((r, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center justify-center w-10 h-10 rounded-lg font-mono font-bold text-lg",
                    r === 20 && lastResult.dice === "d20"
                      ? "bg-success text-success-foreground"
                      : r === 1 && lastResult.dice === "d20"
                        ? "bg-danger text-danger-foreground"
                        : "bg-primary/20 text-primary"
                  )}
                >
                  {r}
                </span>
              ))
            )}
            {lastResult.modifier !== 0 && (
              <>
                <span className="text-foreground-muted">
                  {lastResult.modifier >= 0 ? "+" : ""}
                </span>
                <span className="font-mono text-lg text-foreground-secondary">
                  {lastResult.modifier}
                </span>
              </>
            )}
          </div>

          <div className="text-3xl font-bold">
            = {lastResult.total}
          </div>

          {isCritical && (
            <Badge variant="success" className="mt-2">
              Kritik Başarı!
            </Badge>
          )}
          {isCriticalFail && (
            <Badge variant="danger" className="mt-2">
              Kritik Başarısızlık!
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}


