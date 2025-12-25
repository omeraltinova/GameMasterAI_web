import { Card, CardContent } from "@/components/ui";
import { Sword, Target, Heart, Zap, Users, Bot } from "lucide-react";

export const metadata = {
  title: "Hakkında - GameMaster AI",
  description: "GameMaster AI projesi hakkında bilgi edinin",
};

const values = [
  {
    icon: Heart,
    title: "D&D Tutkusu",
    description: "Masa üstü rol yapma oyunlarına olan sevgimiz bu projenin temelini oluşturuyor.",
  },
  {
    icon: Zap,
    title: "Yenilikçilik",
    description: "Yapay zeka teknolojisini kullanarak TTRPG deneyimini yeniden tanımlıyoruz.",
  },
  {
    icon: Users,
    title: "Topluluk",
    description: "Her seviyeden oyuncuya açık, kapsayıcı bir oyun ortamı sunuyoruz.",
  },
];

const team = [
  {
    name: "AI Game Master",
    role: "Baş Hikaye Anlatıcısı",
    description: "Sonsuz hayal gücü ve 7/24 erişilebilirlik.",
    icon: Bot,
  },
];

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sword className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Hikayemiz</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">GameMaster AI</span>
            <br />
            Hakkında
          </h1>
          <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
            Masa üstü rol yapma oyunlarının büyüsünü dijital dünyaya taşımak için
            yapay zeka teknolojisini kullanıyoruz.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Misyonumuz</h2>
              </div>
              <p className="text-foreground-secondary mb-4">
                GameMaster AI, masa üstü rol yapma oyunlarındaki Game Master
                deneyimini yapay zeka ile herkes için erişilebilir kılmayı
                amaçlıyor.
              </p>
              <p className="text-foreground-secondary mb-4">
                İster deneyimli bir oyuncu olun ister D&D dünyasına yeni adım
                atıyor olun, AI Game Master'ımız size unutulmaz maceralar
                sunmak için burada.
              </p>
              <p className="text-foreground-secondary">
                D&D 5e kurallarına sadık kalarak, hikaye anlatımı, NPC
                etkileşimleri ve savaş yönetimi gibi tüm Game Master
                görevlerini üstleniyoruz.
              </p>
            </div>
            <div className="relative">
              <Card className="p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 rounded-lg bg-background-elevated">
                    <div className="text-3xl font-bold text-primary">D&D</div>
                    <div className="text-sm text-foreground-secondary">5th Edition</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background-elevated">
                    <div className="text-3xl font-bold text-primary">AI</div>
                    <div className="text-sm text-foreground-secondary">Powered</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background-elevated">
                    <div className="text-3xl font-bold text-primary">∞</div>
                    <div className="text-sm text-foreground-secondary">Macera</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background-elevated">
                    <div className="text-3xl font-bold text-primary">24/7</div>
                    <div className="text-sm text-foreground-secondary">Erişim</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Değerlerimiz</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Her kararımızda bizi yönlendiren temel ilkeler.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <Card key={i} className="text-center">
                  <CardContent className="p-8">
                    <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-foreground-secondary">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Technology */}
        <section className="mb-24">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-4">Teknolojimiz</h2>
                <p className="text-foreground-secondary mb-6">
                  En son yapay zeka modellerini kullanarak dinamik ve etkileyici
                  oyun deneyimleri sunuyoruz.
                </p>
                <ul className="space-y-3">
                  {[
                    "Gelişmiş Dil Modelleri (LLM)",
                    "Bağlam Yönetimi Sistemi",
                    "D&D 5e Kural Motoru",
                    "Gerçek Zamanlı Hikaye Üretimi",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-foreground-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 p-8 md:p-12 flex items-center justify-center">
                <div className="text-center">
                  <Bot className="h-24 w-24 text-primary mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">AI-Powered Gaming</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* SRD Notice */}
        <section>
          <Card variant="outline" className="p-8 text-center">
            <p className="text-foreground-secondary text-sm">
              Bu proje, Wizards of the Coast tarafından yayınlanan D&D 5e Systems
              Reference Document (SRD) içeriğini kullanmaktadır. Dungeons &
              Dragons ve D&D, Wizards of the Coast LLC&apos;nin tescilli ticari
              markalarıdır.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}


