"use client";

import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { CharacterCard } from "@/components/character";
import { mockCharacters } from "@/lib/mock-data";
import { Plus, Users, Search } from "lucide-react";
import { useState } from "react";

export default function CharactersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter to user's characters (mock: user_1)
  const userCharacters = mockCharacters.filter(c => c.userId === "user_1");
  
  const filteredCharacters = userCharacters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.race.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Karakterlerim</h1>
          <p className="text-foreground-secondary">
            {userCharacters.length} karakter
          </p>
        </div>
        <Link href="/characters/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Karakter
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Karakter ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Characters Grid */}
      {filteredCharacters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCharacters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      ) : userCharacters.length === 0 ? (
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
              &quot;{searchQuery}&quot; ile eşleşen karakter bulunamadı.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


