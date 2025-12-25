"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import type { DiceType } from "@/types";

interface DiceRollerProps {
  onRoll?: (diceType: DiceType, count: number, modifier: number, result: number[]) => void;
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
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<{
    dice: DiceType;
    results: number[];
    modifier: number;
    total: number;
  } | null>(null);

  const rollDice = () => {
    setIsRolling(true);

    // Simulate rolling animation
    setTimeout(() => {
      const diceMax = diceOptions.find((d) => d.type === selectedDice)?.max || 20;
      const results: number[] = [];

      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * diceMax) + 1);
      }

      const total = results.reduce((a, b) => a + b, 0) + modifier;

      setLastResult({
        dice: selectedDice,
        results,
        modifier,
        total,
      });

      onRoll?.(selectedDice, count, modifier, results);
      setIsRolling(false);
    }, 500);
  };

  const isCritical =
    selectedDice === "d20" &&
    count === 1 &&
    lastResult?.results[0] === 20;
  const isCriticalFail =
    selectedDice === "d20" &&
    count === 1 &&
    lastResult?.results[0] === 1;

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
            {lastResult.results.map((r, i) => (
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
            ))}
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


