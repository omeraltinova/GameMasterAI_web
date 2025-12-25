"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, Progress } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { mockCharacters, mockInventoryItems } from "@/lib/mock-data";
import { formatModifier, calculateModifier, getProficiencyBonus } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  Heart,
  Shield,
  Sparkles,
  Sword,
  Backpack,
  BookOpen,
  User,
} from "lucide-react";

const abilityNames: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export default function CharacterDetailPage() {
  const params = useParams();
  const character = mockCharacters.find((c) => c.id === params.id);

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Karakter bulunamadı</h1>
        <Link href="/characters">
          <Button variant="outline">Karakterlere Dön</Button>
        </Link>
      </div>
    );
  }

  const characterItems = mockInventoryItems.filter(
    (item) => item.characterId === character.id
  );

  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpVariant =
    hpPercentage < 33 ? "danger" : hpPercentage < 66 ? "warning" : "success";

  const proficiencyBonus = getProficiencyBonus(character.level);
  const baseAC = 10 + calculateModifier(character.stats.dexterity);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/characters">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Karakterlere Dön
        </Button>
      </Link>

      {/* Character Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar
                src={character.imageUrl}
                fallback={character.name}
                size="xl"
                className="w-32 h-32"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{character.name}</h1>
                  <p className="text-lg text-foreground-secondary">
                    Level {character.level} {character.race} {character.class}
                  </p>
                </div>
                <Link href={`/characters/${character.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Düzenle
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Heart className="h-5 w-5 mx-auto mb-1 text-danger" />
                  <p className="text-2xl font-bold">
                    {character.hp}/{character.maxHp}
                  </p>
                  <p className="text-xs text-foreground-muted">Hit Points</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{baseAC}</p>
                  <p className="text-xs text-foreground-muted">Armor Class</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-1 text-secondary" />
                  <p className="text-2xl font-bold">+{proficiencyBonus}</p>
                  <p className="text-xs text-foreground-muted">Proficiency</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Sword className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold">30 ft</p>
                  <p className="text-xs text-foreground-muted">Speed</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="abilities">
        <TabsList>
          <TabsTrigger value="abilities">Yetenekler</TabsTrigger>
          <TabsTrigger value="inventory">Envanter</TabsTrigger>
          <TabsTrigger value="background">Geçmiş</TabsTrigger>
        </TabsList>

        {/* Abilities Tab */}
        <TabsContent value="abilities">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Ability Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Ability Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(character.stats).map(([ability, score]) => {
                    const modifier = calculateModifier(score);
                    return (
                      <div
                        key={ability}
                        className="p-4 rounded-lg bg-background-elevated text-center"
                      >
                        <p className="text-xs text-foreground-muted uppercase mb-1">
                          {abilityNames[ability]}
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {formatModifier(modifier)}
                        </p>
                        <p className="text-lg text-foreground-secondary">{score}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* HP & XP */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-danger" />
                  Durum
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* HP */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Hit Points</span>
                    <span className="text-lg">
                      {character.hp}/{character.maxHp}
                    </span>
                  </div>
                  <Progress
                    value={character.hp}
                    max={character.maxHp}
                    variant={hpVariant}
                    size="lg"
                  />
                </div>

                {/* XP */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Experience Points</span>
                    <span className="text-lg">
                      {character.experience.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress
                    value={character.experience % 1000}
                    max={1000}
                    variant="primary"
                    size="lg"
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    Sonraki seviyeye: {1000 - (character.experience % 1000)} XP
                  </p>
                </div>

                {/* Level */}
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-sm text-foreground-secondary mb-1">Level</p>
                  <p className="text-4xl font-bold text-primary">
                    {character.level}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Backpack className="h-5 w-5 text-primary" />
                Envanter
              </CardTitle>
            </CardHeader>
            <CardContent>
              {characterItems.length > 0 ? (
                <div className="space-y-3">
                  {characterItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-background-elevated"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.equipped && (
                            <Badge variant="success" size="sm">
                              Kuşanılmış
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground-secondary">
                          {item.type}
                          {item.quantity > 1 && ` x${item.quantity}`}
                        </p>
                        {item.description && (
                          <p className="text-xs text-foreground-muted mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.properties && (
                        <div className="text-right text-sm">
                          {item.properties.damage && (
                            <p className="text-primary font-mono">
                              {item.properties.damage}
                            </p>
                          )}
                          {item.properties.armorClass && (
                            <p className="text-primary font-mono">
                              AC +{item.properties.armorClass}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Backpack className="h-12 w-12 text-foreground-muted mx-auto mb-3" />
                  <p className="text-foreground-secondary">Envanter boş</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Background Tab */}
        <TabsContent value="background">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Karakter Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {character.background ? (
                <p className="text-foreground-secondary leading-relaxed">
                  {character.background}
                </p>
              ) : (
                <div className="py-12 text-center">
                  <User className="h-12 w-12 text-foreground-muted mx-auto mb-3" />
                  <p className="text-foreground-secondary">
                    Henüz bir geçmiş hikayesi eklenmemiş
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


