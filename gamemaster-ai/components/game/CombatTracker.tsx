"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Progress } from "@/components/ui";
import {
    Swords,
    Shield,
    Heart,
    ChevronRight,
    SkipForward,
    Trophy,
    Skull,
    User,
    Users,
    X,
} from "lucide-react";
import type { Combat, CombatParticipant } from "@/types";

interface CombatTrackerProps {
    combat: Combat;
    onEndCombat?: () => void;
    onNextTurn?: () => void;
    /** false ise izleme modunda */
    isGameMaster?: boolean;
}

export function CombatTracker({
    combat,
    onEndCombat,
    onNextTurn,
    isGameMaster = false,
}: CombatTrackerProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!combat || combat.status === "ended") return null;

    const sortedParticipants = [...combat.turnOrder].sort(
        (a, b) => b.initiative - a.initiative
    );

    const currentParticipant = sortedParticipants[combat.currentTurn % sortedParticipants.length];

    const getTypeIcon = (type: CombatParticipant["type"]) => {
        switch (type) {
            case "player":
                return <User className="h-3.5 w-3.5" />;
            case "enemy":
                return <Skull className="h-3.5 w-3.5" />;
            case "ally":
                return <Users className="h-3.5 w-3.5" />;
        }
    };

    const getTypeBadgeVariant = (type: CombatParticipant["type"]) => {
        switch (type) {
            case "player":
                return "primary" as const;
            case "enemy":
                return "danger" as const;
            case "ally":
                return "success" as const;
        }
    };

    const getHpVariant = (hp: number, maxHp: number) => {
        const pct = (hp / maxHp) * 100;
        if (pct <= 0) return "danger" as const;
        if (pct < 33) return "danger" as const;
        if (pct < 66) return "warning" as const;
        return "success" as const;
    };

    return (
        <Card className="overflow-hidden border-danger/30">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{
                    background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--danger) 15%, transparent), color-mix(in srgb, var(--secondary) 10%, transparent))",
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-danger animate-pulse" />
                    <h3
                        className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: "var(--danger)" }}
                    >
                        Savaş
                    </h3>
                    <Badge variant="secondary" size="sm">
                        Round {combat.round}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted">
                        {sortedParticipants.length} katılımcı
                    </span>
                    <ChevronRight
                        className={`h-4 w-4 text-foreground-muted transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"
                            }`}
                    />
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <CardContent className="p-0">
                    {/* Current Turn Banner */}
                    {currentParticipant && (
                        <div
                            className="px-4 py-2 flex items-center gap-2 text-sm"
                            style={{
                                background:
                                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                                borderBottom: "1px solid var(--border)",
                            }}
                        >
                            <ChevronRight className="h-3 w-3 text-primary animate-pulse" />
                            <span className="text-foreground-muted">Sıra:</span>
                            <span className="font-semibold">{currentParticipant.name}</span>
                        </div>
                    )}

                    {/* Participant List */}
                    <div className="divide-y divide-border">
                        {sortedParticipants.map((participant, index) => {
                            const isActive =
                                index === combat.currentTurn % sortedParticipants.length;
                            const isDead = participant.hp <= 0;

                            return (
                                <div
                                    key={participant.id}
                                    className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${isDead ? "opacity-40" : ""
                                        }`}
                                    style={
                                        isActive
                                            ? {
                                                background:
                                                    "color-mix(in srgb, var(--primary) 8%, transparent)",
                                                borderLeft: "3px solid var(--primary)",
                                            }
                                            : { borderLeft: "3px solid transparent" }
                                    }
                                >
                                    {/* Initiative */}
                                    <div
                                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{
                                            background: "var(--background-elevated)",
                                            border: "1px solid var(--border)",
                                        }}
                                    >
                                        {participant.initiative}
                                    </div>

                                    {/* Name & Type */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`text-sm font-medium truncate ${isDead ? "line-through" : ""
                                                    }`}
                                            >
                                                {participant.name}
                                            </span>
                                            <Badge
                                                variant={getTypeBadgeVariant(participant.type)}
                                                size="sm"
                                            >
                                                {getTypeIcon(participant.type)}
                                            </Badge>
                                        </div>

                                        {/* HP Bar */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <Heart className="h-3 w-3 text-danger flex-shrink-0" />
                                            <Progress
                                                value={Math.max(0, participant.hp)}
                                                max={participant.maxHp}
                                                variant={getHpVariant(participant.hp, participant.maxHp)}
                                                size="sm"
                                            />
                                            <span className="text-xs font-mono text-foreground-muted flex-shrink-0 w-14 text-right">
                                                {participant.hp}/{participant.maxHp}
                                            </span>
                                        </div>
                                    </div>

                                    {/* AC */}
                                    <div
                                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                                        style={{
                                            background: "var(--background-elevated)",
                                            border: "1px solid var(--border)",
                                        }}
                                    >
                                        <Shield className="h-3 w-3 text-info" />
                                        <span className="font-bold">{participant.ac}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* GM Actions */}
                    {isGameMaster && (
                        <div
                            className="px-4 py-3 flex items-center gap-2"
                            style={{ borderTop: "1px solid var(--border)" }}
                        >
                            <button
                                onClick={onNextTurn}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                style={{
                                    background: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                }}
                            >
                                <SkipForward className="h-3.5 w-3.5" />
                                Sonraki Sıra
                            </button>

                            <button
                                onClick={onEndCombat}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                style={{
                                    background: "var(--background-elevated)",
                                    color: "var(--foreground)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <Trophy className="h-3.5 w-3.5 text-warning" />
                                Bitir
                            </button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
