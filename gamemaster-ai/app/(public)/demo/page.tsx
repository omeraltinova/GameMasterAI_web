"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { Dice6, Swords, ArrowRight, Bot, User, Eye, Sparkles, RotateCcw } from "lucide-react";

type MessageType = "gm" | "player" | "dice";

interface BaseMessage {
  type: MessageType;
}

interface TextMessage extends BaseMessage {
  type: "gm" | "player";
  content: string;
}

interface DiceMessage extends BaseMessage {
  type: "dice";
  roll: string;
  skill: string;
  result: number;
  modifier: number;
  total: number;
}

type Message = TextMessage | DiceMessage;

const demoMessages: Message[] = [
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
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance demo
  useEffect(() => {
    if (isComplete) return;

    const showNextMessage = () => {
      if (currentIndex >= demoMessages.length) {
        setIsComplete(true);
        return;
      }

      const nextMessage = demoMessages[currentIndex];
      
      // If next message is from GM, show typing indicator first
      if (nextMessage.type === "gm") {
        setIsTyping(true);
        
        // Show typing for 1.5 seconds, then show message
        const typingTimer = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(prev => [...prev, nextMessage]);
          setCurrentIndex(prev => prev + 1);
        }, 1500);

        return () => clearTimeout(typingTimer);
      } else {
        // Player or dice messages appear immediately
        setVisibleMessages(prev => [...prev, nextMessage]);
        setCurrentIndex(prev => prev + 1);
      }
    };

    // Initial delay before first message
    const delay = currentIndex === 0 ? 800 : 2000;
    const timer = setTimeout(showNextMessage, delay);

    return () => clearTimeout(timer);
  }, [currentIndex, isComplete]);

  const restartDemo = () => {
    setVisibleMessages([]);
    setIsTyping(false);
    setIsComplete(false);
    setCurrentIndex(0);
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
            AI Game Master ile etkileşimi izle ve hikayenin nasıl şekillendiğini gör.
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
                  Demo
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

              {/* Typing Indicator - Only shows when GM is "thinking" */}
              {isTyping && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border shadow-md bg-background-tertiary border-primary/30">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-background-tertiary border border-border/50 rounded-tl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-foreground-muted">GM düşünüyor...</span>
                  </div>
                </div>
              )}

              {/* Empty state before messages start */}
              {visibleMessages.length === 0 && !isTyping && (
                <div className="flex items-center justify-center h-full text-foreground-muted">
                  <div className="text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/50" />
                    <p className="text-sm">Macera başlıyor...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="p-5 bg-background-tertiary border-t border-border/50">
              {isComplete ? (
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3 text-foreground-secondary">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <p className="text-sm">Demo tamamlandı! Kendi efsaneni yazmaya hazır mısın?</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={restartDemo} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Tekrar İzle
                    </Button>
                    <Link href="/register">
                      <Button className="gap-2 px-6 font-semibold">
                        Maceraya Başla
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span>Demo otomatik ilerliyor...</span>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {visibleMessages.length} / {demoMessages.length}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {demoMessages.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < visibleMessages.length 
                    ? 'w-6 bg-primary' 
                    : 'w-1.5 bg-border/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
