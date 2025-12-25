import { Card, CardContent, Avatar, Progress, Badge } from "@/components/ui";
import { formatModifier, calculateModifier } from "@/lib/utils";
import type { Character } from "@/types";
import { Heart, Shield, Sparkles, Sword } from "lucide-react";

interface CharacterMiniProps {
  character: Character;
}

export function CharacterMini({ character }: CharacterMiniProps) {
  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpVariant =
    hpPercentage < 33 ? "danger" : hpPercentage < 66 ? "warning" : "success";

  const ac = 10 + calculateModifier(character.stats.dexterity);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            src={character.imageUrl}
            fallback={character.name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{character.name}</h4>
              <Badge variant="primary" size="sm">
                Lv.{character.level}
              </Badge>
            </div>
            <p className="text-sm text-foreground-secondary">
              {character.race} {character.class}
            </p>
          </div>
        </div>

        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1 text-foreground-muted">
              <Heart className="h-3 w-3 text-danger" />
              HP
            </span>
            <span className="font-mono">
              {character.hp}/{character.maxHp}
            </span>
          </div>
          <Progress
            value={character.hp}
            max={character.maxHp}
            variant={hpVariant}
            size="md"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-background-elevated text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-foreground-muted">AC</p>
            <p className="font-bold">{ac}</p>
          </div>
          <div className="p-2 rounded-lg bg-background-elevated text-center">
            <Sword className="h-4 w-4 mx-auto mb-1 text-secondary" />
            <p className="text-xs text-foreground-muted">STR</p>
            <p className="font-bold">
              {formatModifier(calculateModifier(character.stats.strength))}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background-elevated text-center">
            <Sparkles className="h-4 w-4 mx-auto mb-1 text-accent" />
            <p className="text-xs text-foreground-muted">DEX</p>
            <p className="font-bold">
              {formatModifier(calculateModifier(character.stats.dexterity))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


