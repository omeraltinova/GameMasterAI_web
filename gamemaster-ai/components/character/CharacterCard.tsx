import Link from "next/link";
import { Card, CardContent, Badge, Avatar, Progress } from "@/components/ui";
import { formatModifier, calculateModifier } from "@/lib/utils";
import type { Character } from "@/types";
import { Heart, Shield, Sparkles } from "lucide-react";

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpVariant = hpPercentage < 33 ? "danger" : hpPercentage < 66 ? "warning" : "success";

  return (
    <Link href={`/characters/${character.id}`}>
      <Card hover className="h-full overflow-hidden group">
        {/* Header with Image/Avatar */}
        <div className="relative h-32 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar
              src={character.imageUrl}
              fallback={character.name}
              size="xl"
              className="border-4 border-background shadow-lg group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant="primary">Lv.{character.level}</Badge>
          </div>
        </div>

        <CardContent className="pt-4">
          {/* Name and Class */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold mb-1">{character.name}</h3>
            <p className="text-sm text-foreground-secondary">
              {character.race} {character.class}
            </p>
          </div>

          {/* HP Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1 text-foreground-secondary">
                <Heart className="h-4 w-4 text-danger" />
                HP
              </span>
              <span className="font-medium">
                {character.hp}/{character.maxHp}
              </span>
            </div>
            <Progress value={character.hp} max={character.maxHp} variant={hpVariant} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-background-elevated">
              <Shield className="h-4 w-4 mx-auto mb-1 text-primary" />
              <span className="text-xs text-foreground-muted">AC</span>
              <p className="font-bold">{10 + calculateModifier(character.stats.dexterity)}</p>
            </div>
            <div className="p-2 rounded-lg bg-background-elevated">
              <Sparkles className="h-4 w-4 mx-auto mb-1 text-secondary" />
              <span className="text-xs text-foreground-muted">STR</span>
              <p className="font-bold">{formatModifier(calculateModifier(character.stats.strength))}</p>
            </div>
            <div className="p-2 rounded-lg bg-background-elevated">
              <Sparkles className="h-4 w-4 mx-auto mb-1 text-accent" />
              <span className="text-xs text-foreground-muted">DEX</span>
              <p className="font-bold">{formatModifier(calculateModifier(character.stats.dexterity))}</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
              <span>XP</span>
              <span>{character.experience.toLocaleString()}</span>
            </div>
            <Progress
              value={character.experience % 1000}
              max={1000}
              size="sm"
              variant="primary"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


