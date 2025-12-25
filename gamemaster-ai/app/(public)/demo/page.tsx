"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { Play, Dice6, Swords, ArrowRight, Bot, User, Scroll, Eye, Sparkles } from "lucide-react";

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
    roll: "d20",
    skill: "Insight",
    result: 14,
    modifier: 2,
    total: 16,
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
    <div className="min-h-screen overflow-hidden relative flex flex-col">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-secondary/4 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-20 relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-primary/5 border border-primary/20 mb-6">
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary tracking-[0.2em] uppercase">Canlı Önizleme</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-serif">
            Oyun <span className="text-primary">Deneyimi</span>
          </h1>
          <p className="text-lg text-foreground-secondary max-w-xl mx-auto">
            AI Game Master ile etkileşime geç ve hikayenin nasıl şekillendiğini gör.
          </p>
        </header>

        {/* Main VTT Interface */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="relative flex-1 flex flex-col border border-border/50 rounded-xl bg-background-elevated/80 backdrop-blur shadow-2xl overflow-hidden">
            
            {/* Top Bar */}
            <div className="bg-background-tertiary border-b border-border/50 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold font-serif text-sm leading-tight">Lanetli Konak</h3>
                  <p className="text-xs text-foreground-muted">Bölüm 1: Varış</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Canlı
                </Badge>
                
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-accent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-5 md:p-6 space-y-5 overflow-y-auto custom-scrollbar relative min-h-[400px] max-h-[500px]">
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="w-full h-full" style={{
                  backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />
              </div>

              {visibleMessages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-4 animate-slide-up ${
                    message.type === "player" ? "flex-row-reverse" : ""
                  } ${message.type === "dice" ? "justify-center" : ""}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {message.type === "dice" ? (
                    <div className="my-3">
                      <div className="inline-flex items-center gap-4 px-6 py-4 rounded-lg bg-primary/5 border border-primary/20 shadow-lg relative overflow-hidden group">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Dice6 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs text-foreground-muted uppercase tracking-wider mb-1">{message.skill} Check</div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-2xl font-bold text-primary">{message.total}</span>
                              <span className="text-xs text-foreground-muted">
                                ({message.roll}: {message.result} + {message.modifier})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border shadow-md ${
                          message.type === "gm"
                            ? "bg-background-tertiary border-primary/30"
                            : "bg-background-tertiary border-accent/30"
                        }`}
                      >
                        {message.type === "gm" ? (
                          <Bot className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-accent" />
                        )}
                      </div>
                      
                      {/* Message bubble */}
                      <div
                        className={`relative p-5 rounded-xl max-w-[80%] shadow-md ${
                          message.type === "gm"
                            ? "bg-background-tertiary border border-border/50 rounded-tl-sm"
                            : "bg-accent/5 border border-accent/20 rounded-tr-sm"
                        }`}
                      >
                        <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${
                          message.type === "gm" ? "text-primary/70" : "text-accent/70"
                        }`}>
                          {message.type === "gm" ? "Game Master" : "Sen"}
                        </div>
                        <p className={`leading-relaxed ${
                          message.type === "gm" 
                            ? "font-serif text-foreground/90" 
                            : "text-foreground-secondary"
                        }`}>
                          {message.content}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {currentStep < demoMessages.length - 1 && !showAll && (
                <div className="flex justify-center pt-4">
                  <div className="flex items-center gap-3 text-foreground-muted text-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>GM düşünüyor...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-5 bg-background-tertiary border-t border-border/50">
              {!showAll ? (
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="w-full gap-3 font-semibold py-6 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    {currentStep < demoMessages.length - 1 ? "Hikayeyi İlerlet" : "Demoyu Tamamla"}
                  </span>
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3 text-foreground-secondary">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <p className="text-sm">Bu sadece bir başlangıç. Kendi efsaneni yaz!</p>
                  </div>
                  <Link href="/register">
                    <Button className="gap-2 px-8 py-5 font-semibold whitespace-nowrap">
                      Maceraya Başla
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {!showAll && (
            <div className="flex justify-center gap-2 mt-6">
              {demoMessages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= currentStep 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-border/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
