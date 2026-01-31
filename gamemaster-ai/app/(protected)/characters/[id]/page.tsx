"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar, Progress } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { formatModifier, calculateModifier, getProficiencyBonus } from "@/lib/utils";
import { get, put } from "@/lib/api/client";
import type { Character as CharacterType, InventoryItem, ItemProperties } from "@/types";
import {
  ArrowLeft,
  Edit,
  Heart,
  Shield,
  Sparkles,
  Sword,
  Minus,
  Plus,
  Backpack,
  BookOpen,
  User,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { EquipmentSlots } from "@/components/character/EquipmentSlots";
import { ItemDetailModal } from "@/components/character/ItemDetailModal";

const abilityNames: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

type Character = CharacterType & {
  campaign?: {
    id: string;
    name: string;
    status: string;
  } | null;
};

type InventoryItemData = InventoryItem & {
  properties?: ItemProperties | string | null;
};

const defaultStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export default function CharacterDetailPage() {
  const params = useParams();
  const characterId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [equippedItems, setEquippedItems] = useState<InventoryItemData[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemData[]>([]);
  const [totalWeight, setTotalWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hpInput, setHpInput] = useState<number>(0);
  const [isUpdatingHp, setIsUpdatingHp] = useState(false);
  const [hpUpdateError, setHpUpdateError] = useState<string | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [levelUpError, setLevelUpError] = useState<string | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItemData | null>(null);

  // Item tipi emojileri
  const getItemEmoji = (type: string): string => {
    const emojis: Record<string, string> = {
      Weapon: '⚔️',
      Armor: '🛡️',
      Shield: '🛡️',
      Helmet: '🪖',
      Boots: '👢',
      Gloves: '🧤',
      Cloak: '🧥',
      Ring: '💍',
      Amulet: '📿',
      Accessory: '🎀',
      Potion: '🧪',
      Scroll: '📜',
      Tool: '🔧',
      Consumable: '🍖',
      Treasure: '💎',
      Misc: '📦',
    };
    return emojis[type] || '📦';
  };

  useEffect(() => {
    if (!characterId) return;
    let isMounted = true;

    const fetchCharacterDetails = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const characterResponse = await get<{ success: boolean; characters: Character[] }>("/characters");
        const foundCharacter =
          characterResponse?.characters?.find((item) => item.id === characterId) || null;

        if (!isMounted) return;

        if (!foundCharacter) {
          setCharacter(null);
          setEquippedItems([]);
          setInventoryItems([]);
          setTotalWeight(null);
          setLoadError("Karakter bulunamadı.");
          return;
        }

        setCharacter(foundCharacter);
        setHpInput(foundCharacter.hp ?? 0);

        try {
          const inventoryResponse = await get<{
            success: boolean;
            equipped: InventoryItemData[];
            inventory: InventoryItemData[];
            totalWeight: number;
          }>(`/characters/${characterId}/inventory`);

          if (!isMounted) return;

          if (inventoryResponse?.success) {
            setEquippedItems(inventoryResponse.equipped ?? []);
            setInventoryItems(inventoryResponse.inventory ?? []);
            setTotalWeight(
              typeof inventoryResponse.totalWeight === "number" ? inventoryResponse.totalWeight : null
            );
          }
        } catch (error) {
          console.error("Envanter yüklenemedi:", error);
          if (isMounted) {
            setEquippedItems([]);
            setInventoryItems([]);
            setTotalWeight(null);
          }
        }
      } catch (error) {
        console.error("Karakter bilgileri yüklenemedi:", error);
        if (isMounted) {
          setLoadError("Karakter bilgileri yüklenemedi.");
          setCharacter(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCharacterDetails();

    return () => {
      isMounted = false;
    };
  }, [characterId]);

  useEffect(() => {
    if (character) {
      setHpInput(character.hp);
    }
  }, [character]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">
          {loadError || "Karakter bulunamadı"}
        </h1>
        <Link href="/characters">
          <Button variant="outline">Karakterlere Dön</Button>
        </Link>
      </div>
    );
  }

  const stats = character.stats || defaultStats;
  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpVariant =
    hpPercentage < 33 ? "danger" : hpPercentage < 66 ? "warning" : "success";
  const proficiencyBonus = getProficiencyBonus(character.level);
  const baseAC = 10 + calculateModifier(stats.dexterity);
  const experience = character.experience || 0;
  const nextLevelProgress = 1000 - (experience % 1000);
  const canLevelUp = character.level < 20 && experience >= character.level * 1000;

  const hasItems = equippedItems.length > 0 || inventoryItems.length > 0;

  const getItemProperties = (item: InventoryItemData): ItemProperties | undefined => {
    if (!item.properties) return undefined;
    if (typeof item.properties === "string") {
      try {
        return JSON.parse(item.properties) as ItemProperties;
      } catch (error) {
        return undefined;
      }
    }
    return item.properties;
  };

  const renderItem = (item: InventoryItemData) => {
    const properties = getItemProperties(item);
    return (
      <div
        key={item.id}
        className="flex items-start gap-4 p-4 rounded-lg bg-background-elevated"
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{item.name}</h4>
            {item.quantity > 1 && (
              <Badge variant="outline" size="sm">
                x{item.quantity}
              </Badge>
            )}
            {item.equipped && (
              <Badge variant="success" size="sm">
                Kuşanıldı
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground-secondary">{item.type}</p>
          {item.description && (
            <p className="text-xs text-foreground-muted mt-1">
              {item.description}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-foreground-muted">
          {properties?.damage && (
            <p className="text-primary font-mono text-sm">
              {properties.damage}
            </p>
          )}
          {properties?.armorClass && (
            <p className="text-primary font-mono text-sm">
              AC +{properties.armorClass}
            </p>
          )}
          {item.weight > 0 && <p>{item.weight} lb</p>}
        </div>
      </div>
    );
  };

  const handleHpUpdate = async () => {
    if (!character) return;
    setIsUpdatingHp(true);
    setHpUpdateError(null);
    try {
      const response = await put<{
        success: boolean;
        character: { hp: number; maxHp: number; level: number; experience: number };
      }>(`/characters/${character.id}/hp`, {
        hp: hpInput,
      });

      if (response?.success && response.character) {
        setCharacter((prev) =>
          prev ? { ...prev, hp: response.character.hp, maxHp: response.character.maxHp } : prev
        );
      } else {
        setHpUpdateError("HP guncellenemedi.");
      }
    } catch (error) {
      console.error("HP update error:", error);
      setHpUpdateError("HP guncellenemedi.");
    } finally {
      setIsUpdatingHp(false);
    }
  };

  const handleLevelUp = async () => {
    if (!character) return;
    setIsLevelingUp(true);
    setLevelUpError(null);
    try {
      const response = await put<{
        success: boolean;
        hpGain: number;
        character: { level: number; hp: number; maxHp: number; experience: number };
      }>(`/characters/${character.id}/levelup`, {});

      if (response?.success && response.character) {
        setCharacter((prev) =>
          prev
            ? {
                ...prev,
                level: response.character.level,
                hp: response.character.hp,
                maxHp: response.character.maxHp,
              }
            : prev
        );
      } else {
        setLevelUpError("Seviye atlanamadi.");
      }
    } catch (error) {
      console.error("Level up error:", error);
      setLevelUpError("Seviye atlanamadi.");
    } finally {
      setIsLevelingUp(false);
    }
  };

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
                    Seviye {character.level} {character.race} {character.class}
                  </p>
                  {character.campaign && (
                    <div className="mt-2">
                      <Link href={`/campaigns/${character.campaign.id}`}>
                        <Badge variant="outline">
                          Kampanya: {character.campaign.name}
                        </Badge>
                      </Link>
                    </div>
                  )}
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
                  <p className="text-xs text-foreground-muted">Can Puanı</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{baseAC}</p>
                  <p className="text-xs text-foreground-muted">Zırh Sınıfı</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-1 text-secondary" />
                  <p className="text-2xl font-bold">+{proficiencyBonus}</p>
                  <p className="text-xs text-foreground-muted">Yeterlilik</p>
                </div>
                <div className="p-4 rounded-lg bg-background-elevated text-center">
                  <Sword className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold">30 ft</p>
                  <p className="text-xs text-foreground-muted">Hız</p>
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
                  Yetenek Puanları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats).map(([ability, score]) => {
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
                    <span className="font-medium">Can Puanı</span>
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHpInput((prev) => Math.max(0, prev - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      min={0}
                      max={character.maxHp}
                      value={hpInput}
                      onChange={(event) => {
                        const nextValue = Number.parseInt(event.target.value, 10);
                        setHpInput(Number.isFinite(nextValue) ? nextValue : 0);
                      }}
                      className="h-8 w-20 rounded-lg bg-input border border-border px-2 text-sm text-foreground"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHpInput((prev) => Math.min(character.maxHp, prev + 1))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      isLoading={isUpdatingHp}
                      onClick={handleHpUpdate}
                    >
                      Guncelle
                    </Button>
                  </div>
                  {hpUpdateError && (
                    <p className="text-xs text-danger mt-2">{hpUpdateError}</p>
                  )}
                </div>

                {/* XP */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Deneyim Puanı</span>
                    <span className="text-lg">
                      {experience.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress
                    value={experience % 1000}
                    max={1000}
                    variant="primary"
                    size="lg"
                  />
                  <p className="text-xs text-foreground-muted mt-1">
                    Sonraki seviyeye: {nextLevelProgress} XP
                  </p>
                </div>

                {/* Level */}
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-sm text-foreground-secondary mb-1">Seviye</p>
                  <p className="text-4xl font-bold text-primary">
                    {character.level}
                  </p>
                  {canLevelUp && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 gap-2"
                      isLoading={isLevelingUp}
                      onClick={handleLevelUp}
                    >
                      <Sparkles className="h-4 w-4" />
                      Seviye Atla
                    </Button>
                  )}
                  {levelUpError && (
                    <p className="text-xs text-danger mt-2">{levelUpError}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Equipment Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-primary" />
                  Ekipman Slotları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquipmentSlots
                  equippedItems={equippedItems.map(item => ({
                    ...item,
                    properties: typeof item.properties === 'string' 
                      ? JSON.parse(item.properties) 
                      : item.properties || null
                  }))}
                  onSlotClick={(slot, item) => {
                    if (item) {
                      // Find the original item from equippedItems
                      const originalItem = equippedItems.find(i => i.id === item.id);
                      if (originalItem) {
                        setSelectedInventoryItem(originalItem);
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Quick Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base">
                    <Backpack className="h-5 w-5 text-primary" />
                    Çanta
                  </span>
                  <Badge variant="secondary" size="sm">
                    {inventoryItems.length} item
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryItems.length > 0 ? (
                  <div className="space-y-2">
                    {inventoryItems.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedInventoryItem(item)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg bg-background-elevated hover:bg-border/50 transition-all text-left"
                      >
                        <span className="text-lg">
                          {getItemEmoji(item.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-foreground-muted">{item.type}</p>
                        </div>
                        {item.quantity > 1 && (
                          <Badge variant="outline" size="sm">x{item.quantity}</Badge>
                        )}
                      </button>
                    ))}
                    {inventoryItems.length > 5 && (
                      <p className="text-xs text-foreground-muted text-center pt-2">
                        +{inventoryItems.length - 5} daha fazla item
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Backpack className="h-10 w-10 text-foreground-muted mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-foreground-secondary">Çanta boş</p>
                  </div>
                )}

                {/* Weight info */}
                {typeof totalWeight === "number" && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground-muted">Toplam Ağırlık</span>
                      <span className="font-medium">{totalWeight} lb</span>
                    </div>
                  </div>
                )}

                {/* Full Inventory Link */}
                <Link href={`/characters/${characterId}/inventory`} className="block mt-4">
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Tam Envanteri Görüntüle
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Item Detail Modal */}
          <ItemDetailModal
            item={selectedInventoryItem ? {
              ...selectedInventoryItem,
              properties: typeof selectedInventoryItem.properties === 'string'
                ? JSON.parse(selectedInventoryItem.properties)
                : selectedInventoryItem.properties || null
            } : null}
            isOpen={!!selectedInventoryItem}
            onClose={() => setSelectedInventoryItem(null)}
            onEquip={async (itemId, equip) => {
              try {
                await put(`/characters/${characterId}/inventory/${itemId}/equip`, { equipped: equip });
                // Refresh inventory
                const inventoryResponse = await get<{
                  success: boolean;
                  equipped: InventoryItemData[];
                  inventory: InventoryItemData[];
                  totalWeight: number;
                }>(`/characters/${characterId}/inventory`);
                if (inventoryResponse?.success) {
                  setEquippedItems(inventoryResponse.equipped ?? []);
                  setInventoryItems(inventoryResponse.inventory ?? []);
                  setTotalWeight(inventoryResponse.totalWeight ?? null);
                }
                setSelectedInventoryItem(null);
              } catch (error) {
                console.error("Equip error:", error);
              }
            }}
            editable={false}
          />
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
