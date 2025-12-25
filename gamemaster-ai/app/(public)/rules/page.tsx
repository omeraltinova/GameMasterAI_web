"use client";

import { useState } from "react";
import { BookOpen, Dice6, Sword, Heart, Shield, Sparkles, Scroll, Flame, Zap } from "lucide-react";

const abilityScores = [
  { name: "Strength", abbr: "STR", description: "Fiziksel güç, yakın dövüş, taşıma kapasitesi", color: "secondary" },
  { name: "Dexterity", abbr: "DEX", description: "Çeviklik, refleksler, denge, uzak saldırı", color: "accent" },
  { name: "Constitution", abbr: "CON", description: "Dayanıklılık, sağlık, can puanları", color: "secondary" },
  { name: "Intelligence", abbr: "INT", description: "Mantık, hafıza, araştırma, büyü (Wizard)", color: "primary" },
  { name: "Wisdom", abbr: "WIS", description: "Algı, sezgi, irade gücü, büyü (Cleric/Druid)", color: "primary" },
  { name: "Charisma", abbr: "CHA", description: "Karizma, liderlik, ikna, büyü (Bard/Sorcerer)", color: "primary" },
];

const diceTypes = [
  { type: "d4", uses: "Küçük silah hasarı, minor healing", sides: 4 },
  { type: "d6", uses: "Orta silahlar, sneak attack, fireball", sides: 6 },
  { type: "d8", uses: "Longsword, çoğu silah hasarı", sides: 8 },
  { type: "d10", uses: "Heavy silahlar, cantrip damage", sides: 10 },
  { type: "d12", uses: "Greataxe, barbarian hit die", sides: 12 },
  { type: "d20", uses: "Attack roll, saving throw, ability check", sides: 20 },
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
            <span className="text-xs font-medium text-primary tracking-[0.2em] uppercase">Compendium</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 font-serif tracking-tight">
            D&D 5e <span className="text-primary">Kuralları</span>
          </h1>
          <p className="text-lg text-foreground-secondary max-w-xl mx-auto">
            Temel mekaniklerin hızlı referans rehberi
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
                  <h2 className="text-xl lg:text-2xl font-bold font-serif">Ability Scores</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {abilityScores.map((ability) => (
                    <div
                      key={ability.abbr}
                      className="group p-4 rounded-lg bg-background-tertiary border border-border/30 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          ability.color === 'primary' ? 'bg-primary/20 text-primary' :
                          ability.color === 'secondary' ? 'bg-secondary/20 text-secondary' :
                          'bg-accent/20 text-accent'
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
                <h3 className="text-lg font-bold font-serif mb-4">Modifier Hesaplama</h3>
                
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 p-5 rounded-lg bg-background-tertiary border border-primary/20 text-center">
                    <div className="font-mono text-2xl text-primary mb-2">(Score - 10) ÷ 2</div>
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
                        <span className="text-foreground-secondary text-sm">Score {item.score}</span>
                        <span className={`font-mono font-bold ${item.mod >= 0 ? 'text-accent' : 'text-secondary'}`}>
                          {item.mod > 0 ? '+' : ''}{item.mod}
                        </span>
                      </div>
                    ))}
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
                    { step: 1, title: "Initiative", desc: "d20 + DEX modifier ile sıra belirlenir.", icon: Zap },
                    { step: 2, title: "Tur Aksiyonları", desc: "Movement, Action ve Bonus Action kullan.", icon: Flame },
                    { step: 3, title: "Saldırı", desc: "d20 + modifiers vs hedefin Armor Class (AC).", icon: Sword },
                    { step: 4, title: "Hasar", desc: "İsabet halinde silah zarını at.", icon: Heart },
                  ].map((item, i) => (
                    <div 
                      key={i} 
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
                    <h3 className="font-bold font-serif text-secondary">Critical Hits</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="font-bold text-foreground mb-1">Natural 20</div>
                      <p className="text-sm text-secondary/80">Tüm hasar zarlarını iki kez at.</p>
                    </div>
                    <div className="w-full h-px bg-secondary/20" />
                    <div>
                      <div className="font-bold text-foreground mb-1">Natural 1</div>
                      <p className="text-sm text-secondary/80">Otomatik ıskalama.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent/5 rounded-xl border border-accent/20 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                    <h3 className="font-bold font-serif text-accent">Armor Class</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Zırhsız (Base)</span>
                      <span className="font-bold font-mono">10 + DEX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Leather</span>
                      <span className="font-bold font-mono">11 + DEX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-accent/80">Plate</span>
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
                  <h4 className="font-bold font-serif text-accent mb-2">Advantage</h4>
                  <p className="text-sm text-foreground-secondary mb-4">2d20 at, yüksek olanı al.</p>
                  <div className="font-mono text-xs text-accent/70">
                    Örnek: 13 ve 18 → <span className="text-accent font-bold">18</span> kullan
                  </div>
                </div>
                
                <div className="p-6 rounded-xl bg-secondary/5 border border-secondary/20">
                  <h4 className="font-bold font-serif text-secondary mb-2">Disadvantage</h4>
                  <p className="text-sm text-foreground-secondary mb-4">2d20 at, düşük olanı al.</p>
                  <div className="font-mono text-xs text-secondary/70">
                    Örnek: 13 ve 18 → <span className="text-secondary font-bold">13</span> kullan
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
                      <h4 className="font-bold font-serif text-primary">Cantrips</h4>
                      <span className="text-xs text-primary/70">Seviye 0</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    Sınırsız kullanım. Kaynak harcamadan sürekli atılabilir. 
                    Fire Bolt, Prestidigitation gibi.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-secondary/5 border border-secondary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-bold font-serif text-secondary">Leveled Spells</h4>
                      <span className="text-xs text-secondary/70">Seviye 1-9</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    Spell slot harcar. Slotlar Long Rest ile yenilenir.
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
                        item.color === 'primary' ? 'bg-primary/20 text-primary' :
                        item.color === 'secondary' ? 'bg-secondary/20 text-secondary' :
                        'bg-accent/20 text-accent'
                      }`}>
                        {item.stat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spell Save DC */}
              <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6">
                <h3 className="font-bold font-serif mb-4">Spell Save DC Hesaplama</h3>
                <div className="p-4 rounded-lg bg-background-tertiary border border-primary/20 text-center">
                  <div className="font-mono text-xl text-primary mb-2">
                    8 + Proficiency + Spellcasting Modifier
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Hedefin saving throw'da yenmesi gereken değer
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
