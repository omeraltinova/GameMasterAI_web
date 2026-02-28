"use client";

import { useState } from "react";
import { BookOpen, Dice6, Sword, Heart, Shield, Sparkles, Scroll, Flame, Zap } from "lucide-react";

const abilityScores = [
  { name: "Güç", abbr: "STR", description: "Yakın dövüş, atletizm ve taşıma gücü.", color: "secondary" },
  { name: "Çeviklik", abbr: "DEX", description: "Refleksler, inisiyatif, denge ve uzak saldırılar.", color: "accent" },
  { name: "Dayanıklılık", abbr: "CON", description: "Can puanı, zehir direnci ve fiziksel dayanım.", color: "secondary" },
  { name: "Zeka", abbr: "INT", description: "Bilgi, araştırma ve büyü kuramı.", color: "primary" },
  { name: "Bilgelik", abbr: "WIS", description: "Algı, sezgi, irade ve doğa farkındalığı.", color: "primary" },
  { name: "Karizma", abbr: "CHA", description: "İkna, liderlik ve büyüsel karizma.", color: "primary" },
];

const diceTypes = [
  { type: "d4", uses: "Küçük silahlar ve ufak büyü etkileri", sides: 4 },
  { type: "d6", uses: "Yaygın silah hasarı ve basit büyüler", sides: 6 },
  { type: "d8", uses: "Çoğu silah hasarı ve orta seviye etkiler", sides: 8 },
  { type: "d10", uses: "Ağır silahlar ve sınıf hasarları", sides: 10 },
  { type: "d12", uses: "Büyük silahlar ve barbar can zarı", sides: 12 },
  { type: "d20", uses: "Saldırı, kurtarma ve yetenek kontrolleri", sides: 20 },
];

const tabs = [
  { id: "basics", label: "Temeller", icon: Sparkles },
  { id: "combat", label: "Savaş", icon: Sword },
  { id: "dice", label: "Zarlar", icon: Dice6 },
  { id: "magic", label: "Büyü", icon: BookOpen },
];

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("basics");

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-primary/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/4 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-12 lg:py-20 relative z-10">
        {/* Hero Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-primary/5 border border-primary/20 mb-6">
            <Scroll className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary tracking-[0.2em] uppercase">Hızlı Rehber</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-serif tracking-tight">
            5e SRD <span className="text-primary">Kuralları</span>
          </h1>
          <p className="text-lg text-foreground-secondary max-w-xl mx-auto">
            Mevcut oyun sistemi 5e SRD temellidir. Temel mekanikler için hızlı referans.
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex flex-wrap justify-center gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "bg-background-elevated/50 border border-border/30 text-foreground-secondary hover:border-primary/20 hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-serif">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-5xl mx-auto">
          {/* Basics Tab */}
          {activeTab === "basics" && (
            <div className="animate-fade-in space-y-8">
              {/* Ability Scores */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold font-serif">Yetenek Puanları</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {abilityScores.map((ability) => (
                    <div
                      key={ability.abbr}
                      className="group p-4 rounded-lg bg-background-tertiary border border-border/30 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          ability.color === "primary" ? "bg-primary/20 text-primary" :
                          ability.color === "secondary" ? "bg-secondary/20 text-secondary" :
                          "bg-accent/20 text-accent"
                        }`}>
                          {ability.abbr}
                        </span>
                        <span className="font-bold font-serif text-sm">{ability.name}</span>
                      </div>
                      <p className="text-sm text-foreground-secondary leading-relaxed">
                        {ability.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modifier Calculation */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6 lg:p-8">
                <h3 className="text-lg font-bold font-serif mb-4">Modifikatör Hesaplama</h3>
                
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 p-5 rounded-lg bg-background-tertiary border border-primary/20 text-center">
                    <div className="font-mono text-2xl text-primary mb-2">(Skor - 10) / 2</div>
                    <p className="text-xs text-foreground-muted">Sonucu aşağı yuvarla</p>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    {[ 
                      { score: 8, mod: -1 },
                      { score: 10, mod: 0 },
                      { score: 14, mod: +2 },
                      { score: 18, mod: +4 },
                      { score: 20, mod: +5 },
                    ].map((item) => (
                      <div key={item.score} className="flex items-center justify-between p-2.5 px-4 rounded-lg bg-background-tertiary border border-border/30">
                        <span className="text-foreground-secondary text-sm">Skor {item.score}</span>
                        <span className={`font-mono font-bold ${item.mod >= 0 ? "text-accent" : "text-secondary"}`}>
                          {item.mod > 0 ? "+" : ""}{item.mod}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary border border-border/30">
                    <span className="text-sm text-foreground-secondary">Yeterlilik Bonusu</span>
                    <span className="font-mono font-bold text-accent">Seviyeye göre +2 → +6</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary border border-border/30">
                    <span className="text-sm text-foreground-secondary">Zorluk Sınıfı (DC)</span>
                    <span className="font-mono font-bold text-secondary">Kolay 10 • Orta 15 • Zor 20</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Combat Tab */}
          {activeTab === "combat" && (
            <div className="animate-fade-in space-y-6">
              {/* Combat Flow */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                    <Sword className="w-5 h-5 text-secondary" />
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold font-serif">Savaş Akışı</h2>
                </div>

                <div className="space-y-4">
                  {[
                    { step: 1, title: "İnisiyatif", desc: "d20 + DEX ile sıra belirlenir.", icon: Zap },
                    { step: 2, title: "Tur Yapısı", desc: "Hareket + Aksiyon + Bonus Aksiyon + Tepki.", icon: Flame },
                    { step: 3, title: "Saldırı Atışı", desc: "d20 + uygun bonus, hedefin AC değeri ile karşılaştırılır.", icon: Sword },
                    { step: 4, title: "Hasar", desc: "İsabet halinde silah veya büyü hasar zarları atılır.", icon: Heart },
                    { step: 5, title: "Kurtarma Atışı", desc: "Etkiye göre d20 + ilgili kurtarma bonusu.", icon: Shield },
                  ].map((item) => (
                    <div 
                      key={item.step} 
                      className="flex gap-4 p-4 rounded-lg bg-background-tertiary border border-border/30 hover:border-primary/20 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-serif font-bold text-primary group-hover:bg-primary/20 transition-colors">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold font-serif mb-1">{item.title}</h4>
                        <p className="text-sm text-foreground-secondary">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Hits & AC */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-secondary/5 rounded-xl border border-secondary/20 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-secondary" />
                    <h3 className="font-bold font-serif text-secondary">Kritik Vuruşlar</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="font-bold text-foreground mb-1">Doğal 20</div>
                      <p className="text-sm text-secondary/80">Hasar zarlarını iki kez at.</p>
                    </div>
                    <div className="w-full h-px bg-secondary/20" />
                    <div>
                      <div className="font-bold text-foreground mb-1">Doğal 1</div>
                      <p className="text-sm text-secondary/80">Otomatik ıskalama.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent/5 rounded-xl border border-accent/20 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                    <h3 className="font-bold font-serif text-accent">Zırh Sınıfı (AC)</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Zırhsız</span>
                      <span className="font-bold font-mono">10 + DEX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Hafif Zırh</span>
                      <span className="font-bold font-mono">11 + DEX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Ağır Zırh</span>
                      <span className="font-bold font-mono">18</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dice Tab */}
          {activeTab === "dice" && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {diceTypes.map((dice) => (
                  <div 
                    key={dice.type} 
                    className="group p-6 rounded-xl bg-background-elevated/50 border border-border/30 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-lg font-bold font-mono text-primary">{dice.sides}</span>
                      </div>
                      <span className="text-2xl font-bold text-foreground font-serif">{dice.type}</span>
                    </div>
                    <p className="text-sm text-foreground-secondary leading-relaxed">
                      {dice.uses}
                    </p>
                  </div>
                ))}
              </div>

              {/* Advantage/Disadvantage */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                  <h4 className="font-bold font-serif text-accent mb-2">Avantaj</h4>
                  <p className="text-sm text-foreground-secondary mb-4">2d20 at, yüksek olanı al.</p>
                  <div className="font-mono text-xs text-accent/70">
                    Örnek: 13 ve 18 atışında <span className="text-accent font-bold">18</span> kullan
                  </div>
                </div>
                
                <div className="p-6 rounded-xl bg-secondary/5 border border-secondary/20">
                  <h4 className="font-bold font-serif text-secondary mb-2">Dezavantaj</h4>
                  <p className="text-sm text-foreground-secondary mb-4">2d20 at, düşük olanı al.</p>
                  <div className="font-mono text-xs text-secondary/70">
                    Örnek: 13 ve 18 atışında <span className="text-secondary font-bold">13</span> kullan
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Magic Tab */}
          {activeTab === "magic" && (
            <div className="animate-fade-in space-y-6">
              {/* Spell Types */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold font-serif text-primary">Cantrip</h4>
                      <span className="text-xs text-primary/70">Seviye 0</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    Sınırsız kullanım. Kaynak harcamadan her tur atılabilir.
                    Fire Bolt, Prestidigitation gibi.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-secondary/5 border border-secondary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-bold font-serif text-secondary">Seviyeli Büyüler</h4>
                      <span className="text-xs text-secondary/70">Seviye 1-9</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    Büyü slotu harcar. Slotlar Long Rest ile yenilenir.
                    Fireball, Healing Word gibi.
                  </p>
                </div>
              </div>

              {/* Spellcasting Classes */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6">
                <h3 className="font-bold font-serif mb-4">Büyü Yapan Sınıflar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { class: "Wizard", stat: "INT", color: "primary" },
                    { class: "Cleric", stat: "WIS", color: "accent" },
                    { class: "Druid", stat: "WIS", color: "accent" },
                    { class: "Bard", stat: "CHA", color: "secondary" },
                    { class: "Sorcerer", stat: "CHA", color: "secondary" },
                    { class: "Warlock", stat: "CHA", color: "secondary" },
                    { class: "Paladin", stat: "CHA", color: "secondary" },
                    { class: "Ranger", stat: "WIS", color: "accent" },
                  ].map((item) => (
                    <div 
                      key={item.class} 
                      className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary border border-border/30 hover:border-primary/20 transition-colors"
                    >
                      <span className="font-medium text-sm">{item.class}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                        item.color === "primary" ? "bg-primary/20 text-primary" :
                        item.color === "secondary" ? "bg-secondary/20 text-secondary" :
                        "bg-accent/20 text-accent"
                      }`}>
                        {item.stat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spell Save DC */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6">
                <h3 className="font-bold font-serif mb-4">Büyü Kurtarma DC Hesaplama</h3>
                <div className="p-4 rounded-lg bg-background-tertiary border border-primary/20 text-center">
                  <div className="font-mono text-xl text-primary mb-2">
                    8 + Yeterlilik + Büyü Modifikatörü
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Hedefin kurtarma atışında geçmesi gereken değer
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
