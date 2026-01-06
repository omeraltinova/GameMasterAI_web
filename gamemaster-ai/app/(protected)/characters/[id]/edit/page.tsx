"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Avatar, Badge } from "@/components/ui";
import { ArrowLeft, Loader2, Save, User, Sparkles, BookOpen, Shield } from "lucide-react";
import { get, put } from "@/lib/api/client";
import { races, classes, backgrounds } from "@/lib/mock-data";
import type { CharacterStats, Character } from "@/types";

const defaultStats: CharacterStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

const statFields: { key: keyof CharacterStats; label: string }[] = [
  { key: "strength", label: "Güç (STR)" },
  { key: "dexterity", label: "Çeviklik (DEX)" },
  { key: "constitution", label: "Dayanıklılık (CON)" },
  { key: "intelligence", label: "Zeka (INT)" },
  { key: "wisdom", label: "Bilgelik (WIS)" },
  { key: "charisma", label: "Karizma (CHA)" },
];

export default function CharacterEditPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [formData, setFormData] = useState({
    name: "",
    race: "",
    class: "",
    background: "",
    imageUrl: "",
    stats: defaultStats,
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const raceOptions = useMemo(
    () => races.map((race) => ({ value: race.name, label: race.name })),
    []
  );
  const classOptions = useMemo(
    () => classes.map((cls) => ({ value: cls.name, label: cls.name })),
    []
  );
  const backgroundOptions = useMemo(
    () => backgrounds.map((bg) => ({ value: bg, label: bg })),
    []
  );

  useEffect(() => {
    if (!characterId) return;
    let isMounted = true;

    const loadCharacter = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await get<{ success: boolean; character: Character }>(`/characters/${characterId}`);
        if (!isMounted) return;

        if (response?.success && response.character) {
          const character = response.character;
          setFormData({
            name: character.name || "",
            race: character.race || "",
            class: character.class || "",
            background: character.background || "",
            imageUrl: character.imageUrl || "",
            stats: character.stats || defaultStats,
            level: character.level || 1,
            experience: character.experience || 0,
            hp: character.hp || 0,
            maxHp: character.maxHp || 0,
          });
        } else {
          setError("Karakter bulunamadı.");
        }
      } catch (loadError) {
        console.error("Karakter yüklenemedi:", loadError);
        if (isMounted) {
          setError("Karakter yüklenemedi.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCharacter();
    return () => {
      isMounted = false;
    };
  }, [characterId]);

  const handleStatChange = (key: keyof CharacterStats, value: string) => {
    const parsedValue = Number.parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        [key]: Number.isFinite(parsedValue) ? parsedValue : 0,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!characterId) return;
    if (!formData.name || !formData.race || !formData.class) {
      setError("Lütfen karakter adı, ırk ve sınıf alanlarını doldur.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await put<{ success: boolean }>(`/characters/${characterId}`, {
        name: formData.name,
        race: formData.race,
        class: formData.class,
        background: formData.background || null,
        imageUrl: formData.imageUrl || null,
        stats: formData.stats,
        level: formData.level,
        experience: formData.experience,
        hp: formData.hp,
        maxHp: formData.maxHp,
      });

      if (response?.success) {
        router.push(`/characters/${characterId}`);
      } else {
        setError("Karakter güncellenemedi.");
      }
    } catch (saveError) {
      console.error("Karakter güncelleme hatası:", saveError);
      setError("Karakter güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">{error}</h1>
        <Link href="/characters">
          <Button variant="outline">Karakterlere Dön</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link href={`/characters/${characterId}`}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Karaktere Dön
        </Button>
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Karakteri Düzenle</h1>
          <p className="text-foreground-secondary">Bilgilerini güncelle ve kaydet.</p>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Kaydet
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Temel Bilgiler
          </CardTitle>
          <div className="flex items-center gap-3">
            <Avatar src={formData.imageUrl || undefined} fallback={formData.name || "?"} size="md" />
            {formData.class && (
              <Badge variant="outline" size="sm">
                {formData.class}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            label="Karakter Adı"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Karakter adını gir..."
          />
          <Input
            label="Görsel URL (Opsiyonel)"
            value={formData.imageUrl}
            onChange={(event) => setFormData((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="https://..."
          />
          <Select
            label="Irk"
            value={formData.race}
            onChange={(event) => setFormData((prev) => ({ ...prev, race: event.target.value }))}
            options={raceOptions}
            placeholder="Irk seç"
          />
          <Select
            label="Sınıf"
            value={formData.class}
            onChange={(event) => setFormData((prev) => ({ ...prev, class: event.target.value }))}
            options={classOptions}
            placeholder="Sınıf seç"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Yetenek Puanları
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statFields.map((stat) => (
            <Input
              key={stat.key}
              type="number"
              min={1}
              max={30}
              label={stat.label}
              value={formData.stats[stat.key]}
              onChange={(event) => handleStatChange(stat.key, event.target.value)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Arka Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            label="Arka Plan"
            value={formData.background}
            onChange={(event) => setFormData((prev) => ({ ...prev, background: event.target.value }))}
            options={backgroundOptions}
            placeholder="Arka plan seç"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Oyun İstatistikleri
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Seviye"
            type="number"
            min={1}
            max={20}
            value={formData.level}
            onChange={(event) => setFormData((prev) => ({ ...prev, level: Number.parseInt(event.target.value, 10) || 1 }))}
          />
          <Input
            label="Deneyim"
            type="number"
            min={0}
            value={formData.experience}
            onChange={(event) => setFormData((prev) => ({ ...prev, experience: Number.parseInt(event.target.value, 10) || 0 }))}
          />
          <Input
            label="HP"
            type="number"
            min={0}
            value={formData.hp}
            onChange={(event) => setFormData((prev) => ({ ...prev, hp: Number.parseInt(event.target.value, 10) || 0 }))}
          />
          <Input
            label="Maksimum HP"
            type="number"
            min={0}
            value={formData.maxHp}
            onChange={(event) => setFormData((prev) => ({ ...prev, maxHp: Number.parseInt(event.target.value, 10) || 0 }))}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
