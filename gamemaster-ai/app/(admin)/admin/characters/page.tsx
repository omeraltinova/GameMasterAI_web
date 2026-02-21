"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Spinner,
  useToast,
  ConfirmDialog,
} from "@/components/ui";
import { Search, Trash2, User, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Character } from "@/types";

interface CharacterWithUser extends Character {
  user: {
    id: string;
    username: string;
    email: string;
  };
  campaign?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    inventoryItems: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const races = ["Human", "Elf", "Dwarf", "Halfling", "Gnome", "Half-Elf", "Half-Orc", "Tiefling", "Dragonborn"];
const classes = ["Fighter", "Wizard", "Rogue", "Cleric", "Barbarian", "Bard", "Druid", "Monk", "Paladin", "Ranger", "Sorcerer", "Warlock"];

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterWithUser[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const { addToast } = useToast();

  // Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCharacterName, setDeleteCharacterName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [pagination.page, selectedRace, selectedClass]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      } else {
        fetchCharacters();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (selectedRace) params.append("race", selectedRace);
      if (selectedClass) params.append("class", selectedClass);

      const res = await fetch(`/api/admin/characters?${params}`);
      if (!res.ok) throw new Error("Karakterler alınamadı");
      
      const data = await res.json();
      setCharacters(data.characters);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Karakterler yüklenemedi", error);
      addToast({ type: "error", title: "Hata", description: "Karakterler yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/characters?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");

      setCharacters(characters.filter((c) => c.id !== deleteId));
      addToast({ type: "success", title: "Başarılı", description: "Karakter silindi." });
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Karakter silinemedi." });
    } finally {
      setDeleteId(null);
      setDeleteCharacterName("");
      setIsDeleting(false);
    }
  };

  const confirmDelete = (character: CharacterWithUser) => {
    setDeleteId(character.id);
    setDeleteCharacterName(character.name);
  };

  const getHpColor = (hp: number, maxHp: number) => {
    const ratio = hp / maxHp;
    if (ratio <= 0.25) return "text-danger";
    if (ratio <= 0.5) return "text-warning";
    return "text-success";
  };

  if (loading && characters.length === 0) {
    return (
      <div className="flex justify-center p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Karakterler</h1>
          <p className="text-foreground-secondary">Tüm karakterleri yönet ({pagination.total} toplam)</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Karakter veya kullanıcı ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={selectedRace}
              onChange={(e) => setSelectedRace(e.target.value)}
              options={[{ value: "", label: "Tüm Irklar" }, ...races.map((r) => ({ value: r, label: r }))]}
              className="w-full md:w-48"
            />
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={[{ value: "", label: "Tüm Sınıflar" }, ...classes.map((c) => ({ value: c, label: c }))]}
              className="w-full md:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-elevated border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium">Karakter</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Sahip</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Sınıf / Irk</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Seviye</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Can</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Envanter</th>
                  <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr
                    key={character.id}
                    className="border-b border-border hover:bg-background-elevated/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {character.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{character.name}</p>
                          {character.campaign && (
                            <p className="text-xs text-foreground-muted">
                              {character.campaign.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-foreground-muted" />
                        <span className="text-sm">{character.user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {character.class}
                        </Badge>
                        <span className="text-xs text-foreground-muted">{character.race}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{character.level}</span>
                        <span className="text-xs text-foreground-muted">
                          ({character.experience} XP)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-medium ${getHpColor(character.hp, character.maxHp)}`}>
                        {character.hp}/{character.maxHp}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">
                      {character._count?.inventoryItems || 0} eşya
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/characters/${character.id}`} target="_blank">
                          <Button variant="ghost" size="sm" title="Görüntüle">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => confirmDelete(character)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-foreground-muted">
                Sayfa {pagination.page} / {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={!pagination.hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteCharacterName("");
        }}
        onConfirm={handleDelete}
        title="Karakteri Sil"
        description={`"${deleteCharacterName}" karakterini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        variant="danger"
        confirmText="Sil"
        isLoading={isDeleting}
      />
    </div>
  );
}
