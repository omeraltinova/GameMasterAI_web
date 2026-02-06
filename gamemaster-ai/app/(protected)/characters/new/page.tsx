"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Badge, Progress, Avatar } from "@/components/ui";
import { races, classes, backgrounds } from "@/lib/mock-data";
import { rollAbilityScore, formatModifier, calculateModifier } from "@/lib/utils";
import { post } from "@/lib/api/client";
import type { CharacterStats } from "@/types";
import { ArrowLeft, ArrowRight, Dices, Check, User, Swords, Sparkles, BookOpen, Loader2, Wand2, ChevronDown, ChevronUp, X } from "lucide-react";

type WizardStep = "race" | "class" | "stats" | "details";

const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "race", label: "Irk", icon: User },
  { id: "class", label: "Sınıf", icon: Swords },
  { id: "stats", label: "Yetenekler", icon: Sparkles },
  { id: "details", label: "Detaylar", icon: BookOpen },
];

const initialStats: CharacterStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export default function NewCharacterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("race");
  const [formData, setFormData] = useState({
    name: "",
    race: "",
    class: "",
    stats: initialStats,
    background: "",
    backstory: "",
    imageUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI oluşturma state'leri
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRace, setAiRace] = useState("");
  const [aiClass, setAiClass] = useState("");
  const [aiConcept, setAiConcept] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setAiError(null);

    try {
      const res = await fetch("/api/gm/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race: aiRace || undefined,
          characterClass: aiClass || undefined,
          concept: aiConcept || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.message || "AI karakter oluşturamadı");
        return;
      }

      if (data.success && data.character) {
        const ch = data.character;
        setFormData({
          name: ch.name || "",
          race: ch.race || "",
          class: ch.class || "",
          stats: ch.stats || initialStats,
          background: ch.background || "",
          backstory: ch.backstory || "",
          imageUrl: "",
        });
        // Detaylar adımına atla, kullanıcı gözden geçirsin
        setCurrentStep("details");
        setShowAIPanel(false);
      }
    } catch {
      setAiError("AI ile bağlantı kurulamadı");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  // AI ile doldurulduysa tüm adımlara tıklanabilir olsun
  const allStepsReachable = !!(formData.name && formData.race && formData.class);

  const canProceed = () => {
    switch (currentStep) {
      case "race":
        return !!formData.race;
      case "class":
        return !!formData.class;
      case "stats":
        return true;
      case "details":
        return !!formData.name;
    }
  };

  const handleNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleRollStats = () => {
    setFormData({
      ...formData,
      stats: {
        strength: rollAbilityScore(),
        dexterity: rollAbilityScore(),
        constitution: rollAbilityScore(),
        intelligence: rollAbilityScore(),
        wisdom: rollAbilityScore(),
        charisma: rollAbilityScore(),
      },
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // HP hesapla - sınıfa göre hit die + constitution modifier
      const selectedClass = classes.find(c => c.name === formData.class);
      const hitDie = selectedClass ? parseInt(selectedClass.hitDie.replace('d', '')) : 10;
      const conModifier = calculateModifier(formData.stats.constitution);
      const maxHp = hitDie + conModifier;

      const response = await post<{ success: boolean; character: { id: string }; message?: string }>('/characters', {
        name: formData.name,
        race: formData.race,
        class: formData.class,
        level: 1,
        experience: 0,
        hp: maxHp,
        maxHp: maxHp,
        stats: formData.stats,
        background: formData.background || undefined,
        backstory: formData.backstory || undefined,
        imageUrl: formData.imageUrl || undefined,
      });

      if (response.success && response.character) {
        // Yeni oluşturulan karaktere yönlendir
        router.push(`/characters/${response.character.id}`);
      } else {
        setError('Karakter oluşturulamadı');
      }
    } catch (err: any) {
      console.error('Karakter oluşturma hatası:', err);
      setError(err?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/characters">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          İptal
        </Button>
      </Link>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Yeni Karakter Oluştur</h1>
        <p className="text-foreground-secondary">
          Benzersiz bir kahraman yarat ve maceraya atıl
        </p>
      </div>

      {/* AI ile Oluştur Paneli */}
      <Card className={showAIPanel ? "border-primary/30" : ""}>
        <CardContent className="p-4">
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">AI ile Oluştur</h3>
                <p className="text-xs text-foreground-muted">Konseptini anlat, AI karakteri tasarlasın</p>
              </div>
            </div>
            {showAIPanel ? (
              <ChevronUp className="h-4 w-4 text-foreground-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground-muted" />
            )}
          </button>

          {showAIPanel && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                    Irk Tercihi (Opsiyonel)
                  </label>
                  <div className="relative">
                    <select
                      value={aiRace}
                      onChange={(e) => setAiRace(e.target.value)}
                      className="w-full h-9 px-3 pr-8 rounded-lg appearance-none bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">AI Seçsin</option>
                      {races.map((r) => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                    Sınıf Tercihi (Opsiyonel)
                  </label>
                  <div className="relative">
                    <select
                      value={aiClass}
                      onChange={(e) => setAiClass(e.target.value)}
                      className="w-full h-9 px-3 pr-8 rounded-lg appearance-none bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">AI Seçsin</option>
                      {classes.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5 uppercase tracking-wider">
                  Karakter Konsepti (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={aiConcept}
                  onChange={(e) => setAiConcept(e.target.value)}
                  placeholder="ör: Gizemli bir geçmişe sahip yaşlı büyücü, lanetlenmiş bir şövalye..."
                  className="w-full h-9 px-3 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {aiError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <Button
                onClick={handleGenerateWithAI}
                disabled={isGenerating}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI Karakter Oluşturuyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Karakter Oluştur
                  </>
                )}
              </Button>

              <p className="text-xs text-foreground-muted text-center">
                AI karakteri oluşturacak, ardından detayları gözden geçirip düzenleyebilirsiniz.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-4">
        <Progress value={progress} max={100} size="md" />
        <div className="flex justify-between">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i < currentStepIndex;
            const isCurrent = step.id === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => (i <= currentStepIndex || allStepsReachable) && setCurrentStep(step.id)}
                disabled={i > currentStepIndex && !allStepsReachable}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isCompleted || (allStepsReachable && !isCurrent)
                    ? "text-primary cursor-pointer"
                    : isCurrent
                    ? "text-foreground"
                    : "text-foreground-muted cursor-not-allowed"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isCompleted || isCurrent || allStepsReachable
                      ? "bg-primary/20"
                      : "bg-background-elevated"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm hidden sm:block">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Race Step */}
          {currentStep === "race" && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>Irk Seç</CardTitle>
              </CardHeader>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {races.map((race) => (
                  <button
                    key={race.name}
                    onClick={() => setFormData({ ...formData, race: race.name })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.race === race.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-background-elevated"
                    }`}
                  >
                    <h4 className="font-semibold mb-1">{race.name}</h4>
                    <p className="text-sm text-foreground-secondary mb-2">
                      {race.description}
                    </p>
                    <Badge variant="outline" size="sm">
                      {race.bonuses}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Class Step */}
          {currentStep === "class" && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>Sınıf Seç</CardTitle>
              </CardHeader>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <button
                    key={cls.name}
                    onClick={() => setFormData({ ...formData, class: cls.name })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.class === cls.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-background-elevated"
                    }`}
                  >
                    <h4 className="font-semibold mb-1">{cls.name}</h4>
                    <p className="text-sm text-foreground-secondary mb-2">
                      {cls.description}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="primary" size="sm">
                        {cls.hitDie}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {cls.primaryAbility}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats Step */}
          {currentStep === "stats" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <CardHeader className="p-0">
                  <CardTitle>Ability Scores</CardTitle>
                </CardHeader>
                <Button onClick={handleRollStats} variant="outline" className="gap-2">
                  <Dices className="h-4 w-4" />
                  Zar At (4d6 drop lowest)
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(formData.stats).map(([ability, score]) => (
                  <div
                    key={ability}
                    className="p-4 rounded-lg bg-background-elevated text-center"
                  >
                    <p className="text-sm text-foreground-secondary capitalize mb-2">
                      {ability}
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      {formatModifier(calculateModifier(score))}
                    </p>
                    <p className="text-xl text-foreground-secondary">{score}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-foreground-muted text-center">
                Her stat için 4d6 atılır, en düşük zar çıkarılır ve geri kalanı toplanır.
              </p>
            </div>
          )}

          {/* Details Step */}
          {currentStep === "details" && (
            <div className="space-y-6">
              <CardHeader className="p-0">
                <CardTitle>Karakter Detayları</CardTitle>
              </CardHeader>

              {/* AI ile oluşturulmuş bilgi notu */}
              {formData.name && formData.race && formData.class && formData.backstory && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>AI tarafından oluşturuldu - alanları dilediğiniz gibi düzenleyebilirsiniz.</span>
                </div>
              )}
              <div className="space-y-4">
                <Input
                  label="Karakter Adı"
                  placeholder="Karakterinin adını gir..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

                <div className="grid gap-4 sm:grid-cols-[120px,1fr] items-start">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar
                      src={formData.imageUrl || undefined}
                      fallback={formData.name || "?"}
                      size="xl"
                      className="w-24 h-24"
                    />
                    <label className="text-xs text-foreground-muted">
                      Görsel
                    </label>
                  </div>
                  <div className="space-y-3">
                    <Input
                      label="Görsel URL (Opsiyonel)"
                      placeholder="https://..."
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, imageUrl: e.target.value })
                      }
                    />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Görsel Yükle (Opsiyonel)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-foreground-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === "string") {
                              setFormData((prev) => ({ ...prev, imageUrl: result }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <p className="mt-1 text-xs text-foreground-muted">
                        Yüklenen görsel tarayıcıda base64 olarak kaydedilir.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Background
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {backgrounds.map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setFormData({ ...formData, background: bg })}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          formData.background === bg
                            ? "bg-primary text-primary-foreground"
                            : "bg-background-elevated hover:bg-border text-foreground-secondary"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Backstory (Opsiyonel)"
                  placeholder="Karakterinin geçmişini anlat..."
                  value={formData.backstory}
                  onChange={(e) =>
                    setFormData({ ...formData, backstory: e.target.value })
                  }
                  className="min-h-[120px]"
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-background-elevated">
                <h4 className="font-medium mb-2">Özet</h4>
                <p className="text-foreground-secondary">
                  {formData.name || "İsimsiz"} -{" "}
                  {formData.race || "?"} {formData.class || "?"}{" "}
                  {formData.background && `(${formData.background})`}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>

        {currentStep === "details" ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Karakteri Oluştur
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            İleri
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

