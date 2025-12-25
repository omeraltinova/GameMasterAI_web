"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Play, MessageSquare, Dice6, Swords, ArrowRight, Bot, User } from "lucide-react";

const demoMessages = [
  {
    type: "gm",
    content:
      "Karanlık bir tavernanın kapısından içeri adım atıyorsunuz. Odun ateşinin çıtırtısı ve mırıldanan sesler arasında, köşedeki bir masa dikkatinizi çekiyor. Pelerinli gizemli bir figür sizi işaret ediyor.",
  },
  {
    type: "player",
    content: "Gizemli figüre doğru yürüyorum ve masasına oturuyorum.",
  },
  {
    type: "gm",
    content:
      'Figür pelerininin kapüşonunu geri çekiyor - yaşlı bir Elf kadın. Gözleri bilgelik ve endişe dolu. "Seni bekliyordum, maceracı. Kasabamız büyük tehlike altında. Eski madenlerde... bir şey uyandı."',
  },
  {
    type: "dice",
    content: "🎲 Insight Check: d20 (14) + 2 = 16",
  },
  {
    type: "gm",
    content:
      "Başarılı! Yaşlı Elf'in samimi olduğunu anlıyorsunuz. Korkusu gerçek, ama sizden sakladığı bir şey var gibi görünüyor. Belki de tehlikenin tam boyutunu açıklamıyor.",
  },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const visibleMessages = showAll ? demoMessages : demoMessages.slice(0, currentStep + 1);

  const handleNext = () => {
    if (currentStep < demoMessages.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowAll(true);
    }
  };

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Canlı Demo</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">GameMaster AI</span>
            <br />
            Demo
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
            AI Game Master ile bir oyun oturumunun nasıl ilerlediğini görün.
          </p>
        </div>

        {/* Demo Chat */}
        <div className="max-w-3xl mx-auto mb-12">
          <Card>
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Oyun Oturumu</h3>
                  <p className="text-sm text-foreground-secondary">
                    The Haunted Manor - Bölüm 1
                  </p>
                </div>
              </div>
              <Badge variant="success">Demo</Badge>
            </div>

            <CardContent className="p-4 space-y-4 min-h-[400px]">
              {visibleMessages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-3 animate-slide-up ${
                    message.type === "player" ? "flex-row-reverse" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {message.type === "dice" ? (
                    <div className="w-full flex justify-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning">
                        <Dice6 className="h-4 w-4" />
                        <span className="font-mono">{message.content}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          message.type === "gm"
                            ? "bg-primary/10"
                            : "bg-secondary/10"
                        }`}
                      >
                        {message.type === "gm" ? (
                          <Bot className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-secondary" />
                        )}
                      </div>
                      <div
                        className={`p-4 rounded-lg max-w-[80%] ${
                          message.type === "gm"
                            ? "bg-background-elevated"
                            : "bg-primary/10"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>

            <div className="border-t border-border p-4">
              {!showAll ? (
                <Button onClick={handleNext} className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  {currentStep < demoMessages.length - 1 ? "Devam Et" : "Tamamla"}
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-foreground-secondary">
                    Bu sadece bir önizleme! Gerçek oyunda sınırsız macera sizi bekliyor.
                  </p>
                  <Link href="/register">
                    <Button className="gap-2">
                      Kendi Maceranı Başlat
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              icon: MessageSquare,
              title: "Dinamik Hikaye",
              description: "AI, kararlarınıza göre hikayeyi anlık olarak şekillendirir.",
            },
            {
              icon: Dice6,
              title: "Otomatik Zar",
              description: "Tüm zar atışları ve hesaplamalar otomatik yapılır.",
            },
            {
              icon: Swords,
              title: "Taktiksel Savaş",
              description: "D&D 5e kurallarına uygun turn-based combat sistemi.",
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i} className="text-center">
                <CardContent className="p-6">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-foreground-secondary">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}


