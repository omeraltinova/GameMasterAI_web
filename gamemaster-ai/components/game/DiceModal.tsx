"use client";

import { useState } from "react";
import { Modal, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Sparkles, Skull, Dice6 } from "lucide-react";
import type { DiceType } from "@/types";

type RollMode = 'normal' | 'advantage' | 'disadvantage';

const diceOptions: { type: DiceType; label: string; max: number; color: string }[] = [
    { type: "d4", label: "D4", max: 4, color: "from-blue-500 to-cyan-500" },
    { type: "d6", label: "D6", max: 6, color: "from-green-500 to-emerald-500" },
    { type: "d8", label: "D8", max: 8, color: "from-yellow-500 to-orange-500" },
    { type: "d10", label: "D10", max: 10, color: "from-orange-500 to-red-500" },
    { type: "d12", label: "D12", max: 12, color: "from-red-500 to-pink-500" },
    { type: "d20", label: "D20", max: 20, color: "from-purple-500 to-violet-500" },
    { type: "d100", label: "D100", max: 100, color: "from-gray-500 to-slate-500" },
];

interface DiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRoll?: (diceType: DiceType, count: number, modifier: number, results: number[], rollMode?: RollMode) => void;
}

export function DiceModal({ isOpen, onClose, onRoll }: DiceModalProps) {
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
        setLastResult(null);

        // Rolling animation duration
        setTimeout(() => {
            const diceMax = diceOptions.find((d) => d.type === selectedDice)?.max || 20;
            const results: number[] = [];
            let total = 0;

            if (selectedDice === 'd20' && count === 1 && rollMode !== 'normal') {
                const roll1 = Math.floor(Math.random() * 20) + 1;
                const roll2 = Math.floor(Math.random() * 20) + 1;
                results.push(roll1, roll2);
                const chosenRoll = rollMode === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
                total = chosenRoll + modifier;
            } else {
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
        }, 800);
    };

    const getEffectiveRoll = () => {
        if (!lastResult || lastResult.rollMode === 'normal' || lastResult.results.length < 2) {
            return lastResult?.results[0];
        }
        return lastResult.rollMode === 'advantage'
            ? Math.max(lastResult.results[0], lastResult.results[1])
            : Math.min(lastResult.results[0], lastResult.results[1]);
    };

    const effectiveRoll = getEffectiveRoll();
    const isCritical = lastResult?.dice === "d20" && effectiveRoll === 20;
    const isCriticalFail = lastResult?.dice === "d20" && effectiveRoll === 1;
    const selectedDiceInfo = diceOptions.find(d => d.type === selectedDice);

    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title="🎲 Zar At"
            size="md"
        >
            <div className="space-y-6">
                {/* Dice Selection - Big animated buttons */}
                <div className="grid grid-cols-7 gap-2">
                    {diceOptions.map((dice) => (
                        <button
                            key={dice.type}
                            onClick={() => setSelectedDice(dice.type)}
                            className={cn(
                                "relative p-3 rounded-xl font-mono text-sm font-bold transition-all duration-300",
                                "hover:scale-110 active:scale-95",
                                selectedDice === dice.type
                                    ? `bg-gradient-to-br ${dice.color} text-white shadow-lg shadow-primary/30 scale-110`
                                    : "bg-background-elevated hover:bg-border text-foreground-secondary"
                            )}
                        >
                            {dice.label}
                            {selectedDice === dice.type && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Count and Modifier */}
                <div className="flex gap-6 justify-center">
                    <div className="text-center">
                        <label className="text-xs text-foreground-muted mb-2 block">Adet</label>
                        <div className="flex items-center gap-3 bg-background-elevated rounded-xl p-2">
                            <button
                                onClick={() => setCount(Math.max(1, count - 1))}
                                className="w-8 h-8 rounded-lg bg-background hover:bg-border flex items-center justify-center font-bold transition-all hover:scale-110"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-bold text-xl">{count}</span>
                            <button
                                onClick={() => setCount(Math.min(10, count + 1))}
                                className="w-8 h-8 rounded-lg bg-background hover:bg-border flex items-center justify-center font-bold transition-all hover:scale-110"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <label className="text-xs text-foreground-muted mb-2 block">Modifier</label>
                        <div className="flex items-center gap-3 bg-background-elevated rounded-xl p-2">
                            <button
                                onClick={() => setModifier(modifier - 1)}
                                className="w-8 h-8 rounded-lg bg-background hover:bg-border flex items-center justify-center font-bold transition-all hover:scale-110"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-bold text-xl">
                                {modifier >= 0 ? `+${modifier}` : modifier}
                            </span>
                            <button
                                onClick={() => setModifier(modifier + 1)}
                                className="w-8 h-8 rounded-lg bg-background hover:bg-border flex items-center justify-center font-bold transition-all hover:scale-110"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advantage/Disadvantage for d20 */}
                {selectedDice === 'd20' && count === 1 && (
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => setRollMode('normal')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
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
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1",
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
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1",
                                rollMode === 'disadvantage'
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-background-elevated hover:bg-border text-foreground-secondary"
                            )}
                        >
                            <Skull className="h-4 w-4" />
                            Dezavantaj
                        </button>
                    </div>
                )}

                {/* Rolling Animation / Result Display */}
                <div className="flex justify-center">
                    <div
                        className={cn(
                            "relative w-32 h-32 rounded-2xl flex items-center justify-center transition-all duration-300",
                            `bg-gradient-to-br ${selectedDiceInfo?.color || 'from-primary to-secondary'}`,
                            isRolling && "animate-bounce scale-110",
                            lastResult && !isRolling && isCritical && "ring-4 ring-success shadow-lg shadow-success/50",
                            lastResult && !isRolling && isCriticalFail && "ring-4 ring-danger shadow-lg shadow-danger/50"
                        )}
                    >
                        {/* Spinning dice icon during roll */}
                        {isRolling && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Dice6 className="w-16 h-16 text-white/80 animate-spin" />
                            </div>
                        )}

                        {/* Result */}
                        {lastResult && !isRolling && (
                            <div className="text-center">
                                <div className="text-4xl font-bold text-white drop-shadow-lg animate-scale-in">
                                    {lastResult.total}
                                </div>
                                {lastResult.rollMode !== 'normal' && (
                                    <div className="text-xs text-white/80 mt-1">
                                        [{lastResult.results.join(', ')}]
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Critical badges */}
                        {lastResult && !isRolling && isCritical && (
                            <div className="absolute -top-3 -right-3 animate-bounce">
                                <Badge variant="success" className="shadow-lg">
                                    🌟 Kritik!
                                </Badge>
                            </div>
                        )}
                        {lastResult && !isRolling && isCriticalFail && (
                            <div className="absolute -top-3 -right-3 animate-bounce">
                                <Badge variant="danger" className="shadow-lg">
                                    💀 Kritik Başarısız!
                                </Badge>
                            </div>
                        )}

                        {/* Placeholder when no result */}
                        {!lastResult && !isRolling && (
                            <span className="text-4xl font-bold text-white/50">?</span>
                        )}
                    </div>
                </div>

                {/* Roll Formula */}
                <div className="text-center text-foreground-muted text-sm">
                    {count > 1 ? `${count}` : ''}{selectedDice}
                    {modifier !== 0 && (modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`)}
                    {selectedDice === 'd20' && count === 1 && rollMode !== 'normal' && (
                        <span className="ml-2">
                            ({rollMode === 'advantage' ? '✨ Avantajlı' : '⚠️ Dezavantajlı'})
                        </span>
                    )}
                </div>

                {/* Roll Button */}
                <Button
                    onClick={rollDice}
                    disabled={isRolling}
                    size="lg"
                    className={cn(
                        "w-full gap-3 text-lg py-6 transition-all duration-300",
                        `bg-gradient-to-r ${selectedDiceInfo?.color || 'from-primary to-secondary'}`,
                        "hover:scale-[1.02] active:scale-[0.98]",
                        isRolling && "animate-pulse"
                    )}
                >
                    <Dice6 className={cn("h-6 w-6", isRolling && "animate-spin")} />
                    {isRolling ? "Zar Atılıyor..." : "🎲 Zar At!"}
                </Button>
            </div>
        </Modal>
    );
}
