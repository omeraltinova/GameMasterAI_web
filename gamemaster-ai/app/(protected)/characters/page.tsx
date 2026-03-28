"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { CharacterCard } from "@/components/character";
import {
  Plus,
  Users,
  Search,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { get } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Character } from "@/types";

const RACE_OPTIONS = [
  { value: "Human", label: "Human" },
  { value: "Elf", label: "Elf" },
  { value: "Dwarf", label: "Dwarf" },
  { value: "Halfling", label: "Halfling" },
  { value: "Dragonborn", label: "Dragonborn" },
  { value: "Gnome", label: "Gnome" },
  { value: "Half-Elf", label: "Half-Elf" },
  { value: "Half-Orc", label: "Half-Orc" },
  { value: "Tiefling", label: "Tiefling" },
];

const CLASS_OPTIONS = [
  { value: "Fighter", label: "Fighter" },
  { value: "Wizard", label: "Wizard" },
  { value: "Rogue", label: "Rogue" },
  { value: "Cleric", label: "Cleric" },
  { value: "Ranger", label: "Ranger" },
  { value: "Paladin", label: "Paladin" },
  { value: "Barbarian", label: "Barbarian" },
  { value: "Bard", label: "Bard" },
  { value: "Druid", label: "Druid" },
  { value: "Monk", label: "Monk" },
  { value: "Sorcerer", label: "Sorcerer" },
  { value: "Warlock", label: "Warlock" },
];

const LEVEL_OPTIONS = [
  { value: "1-5", label: "1-5", min: 1, max: 5 },
  { value: "6-10", label: "6-10", min: 6, max: 10 },
  { value: "11-15", label: "11-15", min: 11, max: 15 },
  { value: "16-20", label: "16-20", min: 16, max: 20 },
];

type SortKey = "name" | "level-asc" | "level-desc" | "newest" | "oldest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "oldest", label: "En Eski" },
  { value: "name", label: "İsme Göre" },
  { value: "level-desc", label: "Seviye (Yüksek)" },
  { value: "level-asc", label: "Seviye (Düşük)" },
];

function SortDropdown({ sortBy, onSortChange }: { sortBy: SortKey; onSortChange: (key: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sırala";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 h-10 px-3 pr-8 rounded-lg border text-sm font-medium transition-all",
          open
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-input text-foreground-secondary hover:border-primary/30 hover:text-foreground"
        )}
      >
        <ArrowUpDown className="h-4 w-4" />
        {currentLabel}
        <ChevronDown className={cn("absolute right-2 h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-background shadow-lg overflow-hidden"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSortChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                  sortBy === opt.value
                    ? "bg-primary/10 text-primary"
                    : "text-foreground-secondary hover:bg-background-elevated hover:text-foreground"
                )}
              >
                {opt.label}
                {sortBy === opt.value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CharactersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtre state'leri
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch characters from API
  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true);
      try {
        const response = await get('/characters') as { success: boolean; characters: Character[] };
        if (response?.success && Array.isArray(response.characters)) {
          setCharacters(response.characters);
        }
      } catch (error) {
        console.error('Karakterler alınamadı:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const activeFilterCount = [selectedRace, selectedClass, selectedLevel].filter(Boolean).length;

  const filteredCharacters = useMemo(() => {
    const result = characters.filter((c) => {
      // Metin araması
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.class.toLowerCase().includes(q) &&
          !c.race.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Irk filtresi
      if (selectedRace && c.race !== selectedRace) return false;

      // Sınıf filtresi
      if (selectedClass && c.class !== selectedClass) return false;

      // Seviye filtresi
      if (selectedLevel) {
        const range = LEVEL_OPTIONS.find((o) => o.value === selectedLevel);
        if (range && (c.level < range.min || c.level > range.max)) return false;
      }

      return true;
    });

    // Sıralama
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "level-desc":
          return b.level - a.level;
        case "level-asc":
          return a.level - b.level;
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [characters, searchQuery, selectedRace, selectedClass, selectedLevel, sortBy]);

  const clearFilters = () => {
    setSelectedRace("");
    setSelectedClass("");
    setSelectedLevel("");
    setSortBy("newest");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Karakterlerim</h1>
          <p className="text-foreground-secondary">
            {characters.length} karakter
          </p>
        </div>
        <Link href="/characters/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Karakter
          </Button>
        </Link>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Karakter ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-medium transition-all",
              showFilters || activeFilterCount > 0
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-input text-foreground-secondary hover:border-primary/30 hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtrele
            {activeFilterCount > 0 && (
              <Badge variant="primary" size="sm">{activeFilterCount}</Badge>
            )}
          </button>

          {/* Sıralama - Custom Dropdown */}
          <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Irk */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                  Irk
                </label>
                <div className="relative">
                  <select
                    value={selectedRace}
                    onChange={(e) => setSelectedRace(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-lg appearance-none bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Tümü</option>
                    {RACE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              {/* Sınıf */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                  Sınıf
                </label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-lg appearance-none bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Tümü</option>
                    {CLASS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              {/* Seviye Aralığı */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                  Seviye
                </label>
                <div className="relative">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-lg appearance-none bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Tümü</option>
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>Seviye {opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Aktif filtreler ve temizle */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                <span className="text-xs text-foreground-muted">Aktif:</span>
                {selectedRace && (
                  <Badge variant="primary" size="sm" className="gap-1 cursor-pointer" onClick={() => setSelectedRace("")}>
                    {selectedRace}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedClass && (
                  <Badge variant="secondary" size="sm" className="gap-1 cursor-pointer" onClick={() => setSelectedClass("")}>
                    {selectedClass}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedLevel && (
                  <Badge variant="warning" size="sm" className="gap-1 cursor-pointer" onClick={() => setSelectedLevel("")}>
                    Lv. {selectedLevel}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-foreground-muted hover:text-danger transition-colors ml-auto"
                >
                  Tümünü Temizle
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Sonuç bilgisi */}
      {!isLoading && characters.length > 0 && (searchQuery || activeFilterCount > 0) && (
        <p className="text-sm text-foreground-muted">
          {filteredCharacters.length} sonuç bulundu
        </p>
      )}

      {/* Characters Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        </div>
      ) : filteredCharacters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCharacters.map((character) => (
            <CharacterCard key={character.id} character={character as any} />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Henüz karakterin yok</h3>
            <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
              Maceraya başlamak için ilk karakterini oluştur. Irk, sınıf ve yeteneklerini seçerek benzersiz bir kahraman yarat.
            </p>
            <Link href="/characters/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                İlk Karakterini Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-foreground-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sonuç bulunamadı</h3>
            <p className="text-foreground-secondary">
              Arama veya filtre kriterlerinize uygun karakter bulunamadı.
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Filtreleri Temizle
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
