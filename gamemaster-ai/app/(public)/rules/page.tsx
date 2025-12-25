import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { BookOpen, Dice6, Sword, Heart, Shield, Sparkles } from "lucide-react";

export const metadata = {
  title: "D&D 5e Kuralları - GameMaster AI",
  description: "D&D 5e temel kuralları ve mekanikleri",
};

const abilityScores = [
  { name: "Strength (STR)", description: "Fiziksel güç, yakın dövüş, taşıma kapasitesi" },
  { name: "Dexterity (DEX)", description: "Çeviklik, refleksler, denge, uzak saldırı" },
  { name: "Constitution (CON)", description: "Dayanıklılık, sağlık, can puanları" },
  { name: "Intelligence (INT)", description: "Mantık, hafıza, araştırma, büyü (Wizard)" },
  { name: "Wisdom (WIS)", description: "Algı, sezgi, irade gücü, büyü (Cleric/Druid)" },
  { name: "Charisma (CHA)", description: "Karizma, liderlik, ikna, büyü (Bard/Sorcerer)" },
];

const diceTypes = [
  { type: "d4", uses: "Küçük silah hasarı, minor healing" },
  { type: "d6", uses: "Orta silahlar, sneak attack, fireball" },
  { type: "d8", uses: "Longsword, çoğu silah hasarı" },
  { type: "d10", uses: "Heavy silahlar, cantrip damage" },
  { type: "d12", uses: "Greataxe, barbarian hit die" },
  { type: "d20", uses: "Attack roll, saving throw, ability check" },
  { type: "d100", uses: "Percentile, random tablolar" },
];

export default function RulesPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Kural Kitabı</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">D&D 5e</span>
            <br />
            Temel Kurallar
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
            Dungeons & Dragons 5th Edition temel mekaniklerinin özet rehberi.
          </p>
        </div>

        {/* Rules Tabs */}
        <Tabs defaultValue="basics" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="basics">Temel</TabsTrigger>
            <TabsTrigger value="combat">Savaş</TabsTrigger>
            <TabsTrigger value="dice">Zarlar</TabsTrigger>
            <TabsTrigger value="magic">Büyü</TabsTrigger>
          </TabsList>

          {/* Basics Tab */}
          <TabsContent value="basics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Ability Scores (Yetenek Puanları)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary mb-6">
                    Her karakter altı temel yetenek puanına sahiptir. Bu puanlar 3-20
                    arasında değişir ve karakterinizin yeteneklerini belirler.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {abilityScores.map((ability) => (
                      <div
                        key={ability.name}
                        className="p-4 rounded-lg bg-background-elevated"
                      >
                        <h4 className="font-semibold text-foreground mb-1">
                          {ability.name}
                        </h4>
                        <p className="text-sm text-foreground-secondary">
                          {ability.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Modifier Hesaplama</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary mb-4">
                    Yetenek puanından modifier hesaplamak için:
                  </p>
                  <div className="p-4 rounded-lg bg-background-elevated font-mono text-center text-lg">
                    Modifier = (Ability Score - 10) ÷ 2 (aşağı yuvarla)
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-6 text-center text-sm">
                    {[
                      { score: 8, mod: -1 },
                      { score: 10, mod: 0 },
                      { score: 14, mod: 2 },
                      { score: 18, mod: 4 },
                      { score: 20, mod: 5 },
                    ].map((item) => (
                      <div key={item.score} className="p-2 rounded-lg bg-background-elevated">
                        <div className="text-foreground-secondary">Skor: {item.score}</div>
                        <div className="font-bold text-primary">
                          {item.mod >= 0 ? "+" : ""}
                          {item.mod}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Combat Tab */}
          <TabsContent value="combat">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="h-5 w-5 text-primary" />
                    Savaş Akışı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {[
                      {
                        title: "Initiative (Sıra Belirleme)",
                        desc: "Herkes d20 + DEX modifier atar. Yüksekten düşüğe sıra belirlenir.",
                      },
                      {
                        title: "Tur Başına Aksiyonlar",
                        desc: "Her turda: 1 Action, 1 Bonus Action (varsa), Movement (genelde 30 feet)",
                      },
                      {
                        title: "Attack Roll",
                        desc: "d20 + attack bonus ≥ Target AC = İsabet!",
                      },
                      {
                        title: "Damage Roll",
                        desc: "Silaha göre zar at + modifier",
                      },
                    ].map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-foreground-secondary text-sm">{step.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-danger" />
                    Critical Hits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                      <h4 className="font-semibold text-success mb-2">Natural 20</h4>
                      <p className="text-sm text-foreground-secondary">
                        Kritik isabet! Hasar zarlarını iki katına çıkar.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-danger/10 border border-danger/30">
                      <h4 className="font-semibold text-danger mb-2">Natural 1</h4>
                      <p className="text-sm text-foreground-secondary">
                        Kritik başarısızlık! Otomatik ıskalama.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Armor Class (AC)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary mb-4">
                    AC, saldırının isabet etmesi için gereken minimum zar sonucunu belirler.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <div className="text-2xl font-bold text-primary">10</div>
                      <div className="text-sm text-foreground-secondary">Base (Zırhsız)</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <div className="text-2xl font-bold text-primary">14-16</div>
                      <div className="text-sm text-foreground-secondary">Orta Zırh</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <div className="text-2xl font-bold text-primary">17-20</div>
                      <div className="text-sm text-foreground-secondary">Ağır Zırh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Dice Tab */}
          <TabsContent value="dice">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dice6 className="h-5 w-5 text-primary" />
                  Zar Tipleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground-secondary mb-6">
                  D&D&apos;de farklı zar tipleri farklı amaçlar için kullanılır.
                </p>
                <div className="space-y-3">
                  {diceTypes.map((dice) => (
                    <div
                      key={dice.type}
                      className="flex items-center gap-4 p-4 rounded-lg bg-background-elevated"
                    >
                      <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">{dice.type}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{dice.type.toUpperCase()}</h4>
                        <p className="text-sm text-foreground-secondary">{dice.uses}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <h4 className="font-semibold mb-2">Advantage / Disadvantage</h4>
                  <p className="text-sm text-foreground-secondary">
                    <strong>Advantage:</strong> 2d20 at, yüksek olanı kullan.
                    <br />
                    <strong>Disadvantage:</strong> 2d20 at, düşük olanı kullan.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Magic Tab */}
          <TabsContent value="magic">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Büyü Sistemleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-secondary mb-6">
                    Büyü yapan sınıflar spell slot sistemini kullanır.
                  </p>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <h4 className="font-semibold mb-2">Cantrip</h4>
                      <p className="text-sm text-foreground-secondary">
                        Slot gerektirmez, sınırsız kullanılabilir. Seviyeyle güçlenir.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <h4 className="font-semibold mb-2">Leveled Spells (1-9)</h4>
                      <p className="text-sm text-foreground-secondary">
                        Spell slot kullanır. Long rest sonrası slotlar yenilenir.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background-elevated">
                      <h4 className="font-semibold mb-2">Spell Save DC</h4>
                      <p className="text-sm text-foreground-secondary">
                        8 + Proficiency Bonus + Spellcasting Modifier
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spellcasting Sınıfları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { class: "Wizard", ability: "Intelligence" },
                      { class: "Cleric", ability: "Wisdom" },
                      { class: "Druid", ability: "Wisdom" },
                      { class: "Bard", ability: "Charisma" },
                      { class: "Sorcerer", ability: "Charisma" },
                      { class: "Warlock", ability: "Charisma" },
                    ].map((item) => (
                      <div
                        key={item.class}
                        className="flex items-center justify-between p-3 rounded-lg bg-background-elevated"
                      >
                        <span className="font-medium">{item.class}</span>
                        <span className="text-sm text-primary">{item.ability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


