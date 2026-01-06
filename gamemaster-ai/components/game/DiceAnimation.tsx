"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface DiceAnimationProps {
    isRolling: boolean;
    diceType: string;
    results?: number[];
    onAnimationComplete?: () => void;
    className?: string;
}

// Dice face characters for visual representation
const diceFaces: Record<string, string[]> = {
    d4: ['▲', '◆', '●', '■'],
    d6: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'],
    d8: ['◇', '◆', '○', '●', '□', '■', '△', '▲'],
    d10: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    d12: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
    d20: Array.from({ length: 20 }, (_, i) => String(i + 1)),
    d100: Array.from({ length: 10 }, (_, i) => String(i * 10)),
};

export function DiceAnimation({
    isRolling,
    diceType,
    results,
    onAnimationComplete,
    className,
}: DiceAnimationProps) {
    const [displayValue, setDisplayValue] = useState<string>('?');
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'rolling' | 'landing' | 'complete'>('idle');

    // Get the max value for the dice type
    const getMaxValue = (type: string) => {
        const match = type.match(/d(\d+)/);
        return match ? parseInt(match[1]) : 20;
    };

    // Random value generator
    const getRandomValue = useCallback(() => {
        const max = getMaxValue(diceType);
        return Math.floor(Math.random() * max) + 1;
    }, [diceType]);

    useEffect(() => {
        if (isRolling) {
            setAnimationPhase('rolling');

            // Rapid random values during rolling
            const rollInterval = setInterval(() => {
                setDisplayValue(String(getRandomValue()));
            }, 50);

            // Stop rolling after 400ms
            const stopTimer = setTimeout(() => {
                clearInterval(rollInterval);
                setAnimationPhase('landing');

                // Show final result
                if (results && results.length > 0) {
                    setDisplayValue(String(results[0]));
                }

                // Complete animation
                setTimeout(() => {
                    setAnimationPhase('complete');
                    onAnimationComplete?.();
                }, 200);
            }, 400);

            return () => {
                clearInterval(rollInterval);
                clearTimeout(stopTimer);
            };
        } else {
            setAnimationPhase('idle');
            if (results && results.length > 0) {
                setDisplayValue(String(results[0]));
            } else {
                setDisplayValue('?');
            }
        }
    }, [isRolling, results, getRandomValue, onAnimationComplete]);

    // Determine styling based on result
    const isCriticalSuccess = diceType === 'd20' && results?.[0] === 20;
    const isCriticalFail = diceType === 'd20' && results?.[0] === 1;

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div
                className={cn(
                    "relative w-20 h-20 rounded-xl flex items-center justify-center font-mono text-3xl font-bold transition-all duration-200",
                    // Animation states
                    animationPhase === 'rolling' && "animate-bounce scale-110",
                    animationPhase === 'landing' && "animate-pulse scale-105",
                    animationPhase === 'complete' && "scale-100",
                    // Result styling
                    isCriticalSuccess && animationPhase === 'complete'
                        ? "bg-success text-success-foreground ring-4 ring-success/50 shadow-lg shadow-success/30"
                        : isCriticalFail && animationPhase === 'complete'
                            ? "bg-danger text-danger-foreground ring-4 ring-danger/50 shadow-lg shadow-danger/30"
                            : "bg-primary/20 text-primary ring-2 ring-primary/30"
                )}
            >
                {/* Glow effect for criticals */}
                {animationPhase === 'complete' && (isCriticalSuccess || isCriticalFail) && (
                    <div
                        className={cn(
                            "absolute inset-0 rounded-xl animate-ping opacity-50",
                            isCriticalSuccess ? "bg-success" : "bg-danger"
                        )}
                    />
                )}

                {/* Dice value */}
                <span className="relative z-10">{displayValue}</span>

                {/* Dice type indicator */}
                <span className="absolute -bottom-1 -right-1 text-xs bg-background px-1 rounded">
                    {diceType}
                </span>
            </div>
        </div>
    );
}

// Compact inline animation for embedding in other components
export function DiceAnimationInline({
    isRolling,
    results,
    diceType = 'd20',
    className,
}: {
    isRolling: boolean;
    results?: number[];
    diceType?: string;
    className?: string;
}) {
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
        if (isRolling) {
            const max = parseInt(diceType.replace('d', ''));
            const interval = setInterval(() => {
                setDisplayValue(String(Math.floor(Math.random() * max) + 1));
            }, 50);

            return () => clearInterval(interval);
        } else if (results && results.length > 0) {
            setDisplayValue(String(results[0]));
        }
    }, [isRolling, results, diceType]);

    if (!isRolling && !results) return null;

    return (
        <span
            className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold",
                isRolling && "animate-spin",
                results?.[0] === 20 ? "bg-success text-success-foreground" :
                    results?.[0] === 1 ? "bg-danger text-danger-foreground" :
                        "bg-primary/20 text-primary",
                className
            )}
        >
            {displayValue || '?'}
        </span>
    );
}
