"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Badge, Progress } from "@/components/ui";
import { races, classes, backgrounds } from "@/lib/mock-data";
import { rollAbilityScore, formatModifier, calculateModifier } from "@/lib/utils";
import type { CharacterStats } from "@/types";
import { ArrowLeft, ArrowRight, Dices, Check, User, Swords, Sparkles, BookOpen } from "lucide-react";

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
  });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

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

  const handleSubmit = () => {
    console.log("Creating character:", formData);
    // In a real app, this would save to the database
    router.push("/characters");
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
                onClick={() => i <= currentStepIndex && setCurrentStep(step.id)}
                disabled={i > currentStepIndex}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isCompleted
                    ? "text-primary cursor-pointer"
                    : isCurrent
                    ? "text-foreground"
                    : "text-foreground-muted cursor-not-allowed"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isCompleted || isCurrent
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
              <div className="space-y-4">
                <Input
                  label="Karakter Adı"
                  placeholder="Karakterinin adını gir..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

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
            disabled={!canProceed()}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Karakteri Oluştur
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


