"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Badge } from "@/components/ui";
import { mockScenarios } from "@/lib/mock-data";
import { ArrowLeft, Swords, Users, User, Map, Check } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scenarioId: "",
    isMultiplayer: false,
    maxPlayers: 4,
  });

  const selectedScenario = mockScenarios.find((s) => s.id === formData.scenarioId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating campaign:", formData);
    router.push("/campaigns");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/campaigns">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          İptal
        </Button>
      </Link>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Yeni Kampanya</h1>
        <p className="text-foreground-secondary">
          Epik bir macera oluştur ve kahramanları topla
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Temel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Kampanya Adı"
              placeholder="Epik maceranın adını gir..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Textarea
              label="Açıklama (Opsiyonel)"
              placeholder="Kampanyanı kısaca anlat..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Player Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Oyuncu Modu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, isMultiplayer: false, maxPlayers: 1 })
                }
                className={`p-4 rounded-lg border text-left transition-all ${
                  !formData.isMultiplayer
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-background-elevated"
                }`}
              >
                <User className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-semibold">Solo</h4>
                <p className="text-sm text-foreground-secondary">
                  Tek başına maceraya çık
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, isMultiplayer: true, maxPlayers: 4 })
                }
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.isMultiplayer
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-background-elevated"
                }`}
              >
                <Users className="h-6 w-6 text-secondary mb-2" />
                <h4 className="font-semibold">Çok Oyunculu</h4>
                <p className="text-sm text-foreground-secondary">
                  Arkadaşlarınla birlikte oyna
                </p>
              </button>
            </div>

            {formData.isMultiplayer && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Maksimum Oyuncu Sayısı
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, maxPlayers: num })}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        formData.maxPlayers === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-background-elevated hover:bg-border"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenario Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Senaryo Seç (Opsiyonel)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              Hazır bir senaryo seç veya boş bırakarak özgür maceraya başla.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Free Play Option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, scenarioId: "" })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  !formData.scenarioId
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-background-elevated"
                }`}
              >
                <h4 className="font-semibold mb-1">Özgür Macera</h4>
                <p className="text-sm text-foreground-secondary">
                  AI ile tamamen özgür bir hikaye oluştur
                </p>
              </button>

              {/* Scenarios */}
              {mockScenarios.slice(0, 3).map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, scenarioId: scenario.id })
                  }
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.scenarioId === scenario.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-background-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{scenario.title}</h4>
                    {scenario.isOfficial && (
                      <Badge variant="primary" size="sm">
                        Resmi
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground-secondary line-clamp-2">
                    {scenario.description}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" size="sm">
                      {scenario.genre}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {scenario.difficulty}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>

            <Link href="/scenarios" className="block">
              <Button variant="ghost" size="sm" className="w-full">
                Tüm Senaryoları Gör
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Summary */}
        {formData.name && (
          <Card variant="outline" className="bg-primary/5">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Özet</h4>
              <ul className="space-y-1 text-sm text-foreground-secondary">
                <li>
                  <strong>Kampanya:</strong> {formData.name}
                </li>
                <li>
                  <strong>Mod:</strong>{" "}
                  {formData.isMultiplayer
                    ? `Çok Oyunculu (${formData.maxPlayers} kişi)`
                    : "Solo"}
                </li>
                <li>
                  <strong>Senaryo:</strong>{" "}
                  {selectedScenario ? selectedScenario.title : "Özgür Macera"}
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/campaigns" className="flex-1">
            <Button variant="outline" className="w-full">
              İptal
            </Button>
          </Link>
          <Button type="submit" className="flex-1 gap-2" disabled={!formData.name}>
            <Check className="h-4 w-4" />
            Kampanyayı Oluştur
          </Button>
        </div>
      </form>
    </div>
  );
}


