"use client";

import { Modal, Badge, Progress, Avatar } from "@/components/ui";
import { cn, formatModifier, calculateModifier } from "@/lib/utils";
import type { Character } from "@/types";
import {
  Heart,
  Shield,
  Sword,
  Sparkles,
  Brain,
  Eye,
  MessageCircle,
  Flame,
  Star,
} from "lucide-react";

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
}

const statConfig = [
  { key: "strength", label: "STR", fullLabel: "Güç", icon: Sword, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  { key: "dexterity", label: "DEX", fullLabel: "Çeviklik", icon: Sparkles, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  { key: "constitution", label: "CON", fullLabel: "Dayanıklılık", icon: Shield, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { key: "intelligence", label: "INT", fullLabel: "Zeka", icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { key: "wisdom", label: "WIS", fullLabel: "Bilgelik", icon: Eye, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { key: "charisma", label: "CHA", fullLabel: "Karizma", icon: MessageCircle, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
] as const;

export function CharacterModal({ isOpen, onClose, character }: CharacterModalProps) {
  if (!character) return null;

  const stats = character.stats;
  const hp = character.hp ?? 0;
  const maxHp = character.maxHp ?? 100;
  const level = character.level ?? 1;
  const experience = character.experience ?? 0;

  const hpPercentage = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const hpVariant =
    hpPercentage < 33 ? "danger" : hpPercentage < 66 ? "warning" : "success";

  const ac = stats ? 10 + calculateModifier(stats.dexterity ?? 10) : 10;

  // XP thresholds per level (simplified D&D 5e)
  const xpForNextLevel = level * 1000;
  const xpProgress = xpForNextLevel > 0 ? Math.min((experience / xpForNextLevel) * 100, 100) : 0;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="🧙 Karakter Detayları"
      size="lg"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto -mx-2 px-2">
        {/* Character Header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-elevated border border-border/50">
          <Avatar
            src={character.imageUrl}
            fallback={character.name}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold truncate">{character.name}</h3>
              <Badge variant="primary">Lv.{level}</Badge>
            </div>
            <p className="text-sm text-foreground-secondary mt-1">
              {character.race} {character.class}
            </p>
            {character.background && (
              <p className="text-xs text-foreground-muted mt-1 italic">
                {character.background}
              </p>
            )}
          </div>
        </div>

        {/* HP & AC Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* HP */}
          <div className="p-4 rounded-xl bg-background-elevated border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Heart className="h-4 w-4 text-danger" />
                Can Puanı
              </span>
              <span className="font-mono font-bold text-lg">
                {hp}<span className="text-foreground-muted text-sm">/{maxHp}</span>
              </span>
            </div>
            <Progress
              value={hp}
              max={maxHp}
              variant={hpVariant}
              size="md"
            />
          </div>

          {/* AC & XP */}
          <div className="grid grid-rows-2 gap-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background-elevated border border-border/50">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Zırh Sınıfı
              </span>
              <span className="font-bold text-xl text-primary">{ac}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-background-elevated border border-border/50">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Star className="h-4 w-4 text-yellow-400" />
                XP
              </span>
              <span className="font-mono text-sm">
                {experience}<span className="text-foreground-muted">/{xpForNextLevel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Ability Scores */}
        {stats && (
          <div>
            <h4 className="text-sm font-medium text-foreground-muted mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Yetenek Puanları
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {statConfig.map((stat) => {
                const value = stats[stat.key as keyof typeof stats] ?? 10;
                const mod = calculateModifier(value);
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.key}
                    className={cn(
                      "relative p-3 rounded-xl text-center transition-all duration-200",
                      "hover:scale-105",
                      stat.bg,
                      "border",
                      stat.border
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
                    <p className="text-[10px] text-foreground-muted uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                    <p className={cn("text-sm font-semibold", mod >= 0 ? "text-success" : "text-danger")}>
                      {formatModifier(mod)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Derived Stats */}
        {stats && (
          <div>
            <h4 className="text-sm font-medium text-foreground-muted mb-3">
              Türetilmiş Değerler
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: "Girişimcilik",
                  value: formatModifier(calculateModifier(stats.dexterity ?? 10)),
                  desc: "DEX mod",
                },
                {
                  label: "Algı",
                  value: String(10 + calculateModifier(stats.wisdom ?? 10)),
                  desc: "Pasif",
                },
                {
                  label: "Yeterlilik",
                  value: `+${Math.ceil(level / 4) + 1}`,
                  desc: "Bonus",
                },
                {
                  label: "Hız",
                  value: "30ft",
                  desc: "Hareket",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-lg bg-background-elevated border border-border/30 text-center"
                >
                  <p className="text-xs text-foreground-muted">{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-foreground-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
