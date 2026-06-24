"use client";

import { Skull, Target, Heart } from "lucide-react";
import type { Combat, CombatParticipant } from "@/types";

interface TargetSelectorProps {
    combat: Combat;
    selectedTargetId: string | null;
    onSelect: (id: string) => void;
    /** Hidden while the player cannot act (e.g. not their turn). */
    disabled?: boolean;
    className?: string;
}

/**
 * Lets the player choose which living enemy their next combat action targets.
 * Falls back (in the play page) to the first living enemy when nothing is picked.
 */
export function TargetSelector({
    combat,
    selectedTargetId,
    onSelect,
    disabled = false,
    className,
}: TargetSelectorProps) {
    if (!combat || combat.status !== "active") return null;

    const aliveEnemies: CombatParticipant[] = combat.participants.filter(
        (participant) => participant.type === "enemy" && participant.hp > 0,
    );

    if (aliveEnemies.length === 0) return null;

    const effectiveSelectedId =
        selectedTargetId && aliveEnemies.some((e) => e.id === selectedTargetId)
            ? selectedTargetId
            : aliveEnemies[0]?.id ?? null;

    return (
        <div
            className={`rounded-lg border border-border/60 bg-background-elevated/40 px-3 py-2 ${className ?? ""}`}
        >
            <div className="flex items-center gap-1.5 mb-2">
                <Target className="h-3.5 w-3.5 text-danger" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Hedef Seç
                </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {aliveEnemies.map((enemy) => {
                    const isSelected = enemy.id === effectiveSelectedId;
                    return (
                        <button
                            key={enemy.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(enemy.id)}
                            title={`${enemy.name} — ${enemy.hp}/${enemy.maxHp} HP, AC ${enemy.ac}`}
                            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-all ${
                                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            } ${
                                isSelected
                                    ? "border-danger bg-danger/15 text-foreground"
                                    : "border-border bg-background-elevated text-foreground-muted hover:border-danger/60"
                            }`}
                        >
                            <Skull className="h-3 w-3 text-danger" />
                            <span className="font-medium truncate max-w-[8rem]">{enemy.name}</span>
                            <span className="flex items-center gap-0.5 font-mono text-[10px] text-foreground-muted">
                                <Heart className="h-2.5 w-2.5 text-danger" />
                                {enemy.hp}/{enemy.maxHp}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
