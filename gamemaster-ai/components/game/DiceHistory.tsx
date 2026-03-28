"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Clock, Dice6, TrendingUp, Star, Skull } from "lucide-react";

interface DiceRoll {
    id: string;
    diceType: string;
    count: number;
    results: number[];
    modifier: number;
    total: number;
    purpose?: string;
    character?: {
        id: string;
        name: string;
    };
    timestamp: string;
}

interface DiceStats {
    totalRolls: number;
    d20Rolls: number;
    criticalSuccesses: number;
    criticalFailures: number;
    averageD20: number;
}

interface DiceHistoryProps {
    sessionId: string;
    characterId?: string;
    limit?: number;
    showStats?: boolean;
    refreshSignal?: number;
    className?: string;
}

export function DiceHistory({
    sessionId,
    characterId,
    limit = 10,
    showStats = true,
    refreshSignal = 0,
    className,
}: DiceHistoryProps) {
    const [rolls, setRolls] = useState<DiceRoll[]>([]);
    const [stats, setStats] = useState<DiceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!sessionId) {
            setRolls([]);
            setStats(null);
            setError('Session bulunamadı');
            setIsLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams({ limit: limit.toString() });
            if (characterId) params.set('characterId', characterId);

            const response = await fetch(`/api/sessions/${sessionId}/dice-history?${params}`);
            const data = await response.json();

            if (data.success) {
                setRolls(data.rolls);
                setStats(data.stats);
                setError(null);
            } else {
                setError(data.error || 'Zar geçmişi yüklenemedi');
            }
        } catch (err) {
            setError('Zar geçmişi yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, characterId, limit]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshSignal]);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className={cn("animate-pulse space-y-2", className)}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-background-elevated rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("text-center text-danger text-sm p-4", className)}>
                {error}
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Stats */}
            {showStats && stats && stats.totalRolls > 0 && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-background-elevated rounded-lg">
                    <div className="flex items-center gap-2">
                        <Dice6 className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground-muted">Toplam:</span>
                        <span className="font-bold">{stats.totalRolls}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground-muted">Ort. d20:</span>
                        <span className="font-bold">{stats.averageD20}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground-muted">Kritik:</span>
                        <span className="font-bold text-success">{stats.criticalSuccesses}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skull className="h-4 w-4 text-danger" />
                        <span className="text-sm text-foreground-muted">Başarısız:</span>
                        <span className="font-bold text-danger">{stats.criticalFailures}</span>
                    </div>
                </div>
            )}

            {/* Roll List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {rolls.length === 0 ? (
                    <div className="text-center text-foreground-muted text-sm py-4">
                        Henüz zar atılmadı
                    </div>
                ) : (
                    rolls.map((roll) => (
                        <div
                            key={roll.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-background-elevated hover:bg-border/50 transition-colors"
                        >
                            {/* Dice Type */}
                            <Badge variant="secondary" className="font-mono">
                                {roll.count > 1 ? `${roll.count}` : ''}{roll.diceType}
                            </Badge>

                            {/* Results */}
                            <div className="flex-1 flex items-center gap-1 flex-wrap">
                                {roll.results.map((r, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold",
                                            r === 20 && roll.diceType === 'd20'
                                                ? "bg-success text-success-foreground"
                                                : r === 1 && roll.diceType === 'd20'
                                                    ? "bg-danger text-danger-foreground"
                                                    : "bg-primary/20 text-primary"
                                        )}
                                    >
                                        {r}
                                    </span>
                                ))}
                                {roll.modifier !== 0 && (
                                    <span className="text-xs text-foreground-muted">
                                        {roll.modifier >= 0 ? '+' : ''}{roll.modifier}
                                    </span>
                                )}
                                <span className="text-sm font-bold ml-1">= {roll.total}</span>
                            </div>

                            {/* Purpose */}
                            {roll.purpose && (
                                <span className="text-xs text-foreground-muted truncate max-w-20">
                                    {roll.purpose}
                                </span>
                            )}

                            {/* Time */}
                            <span className="text-xs text-foreground-muted flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(roll.timestamp)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
