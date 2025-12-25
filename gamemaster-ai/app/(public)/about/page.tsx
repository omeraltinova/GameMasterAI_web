import { Sword, Target, Heart, Zap, Users, Bot, Scroll, Compass, Flame, Star } from "lucide-react";

export const metadata = {
  title: "Hakkında - GameMaster AI",
  description: "GameMaster AI projesi hakkında bilgi edinin",
};

const values = [
  {
    icon: Heart,
    title: "D&D Tutkusu",
    description: "Masa üstü rol yapma oyunlarına olan sevgimiz bu projenin temelini oluşturuyor.",
    color: "secondary",
  },
  {
    icon: Zap,
    title: "Yenilikçilik",
    description: "Yapay zeka teknolojisini kullanarak TTRPG deneyimini yeniden tanımlıyoruz.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Topluluk",
    description: "Her seviyeden oyuncuya açık, kapsayıcı bir oyun ortamı sunuyoruz.",
    color: "accent",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-secondary/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        {/* Hero Header */}
        <header className="text-center mb-20 lg:mb-28">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-secondary/5 border border-secondary/20 mb-8">
            <Scroll className="h-3.5 w-3.5 text-secondary" />
            <span className="text-xs font-medium text-secondary tracking-[0.2em] uppercase">Hikayemiz</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-serif tracking-tight leading-tight">
            Bir Maceraperest Grubu,
            <br />
            <span className="text-primary">Bir Vizyon</span>
          </h1>
          
          <p className="text-xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
            Masaüstü rol yapma oyunlarının büyüsünü, teknolojinin sınırsız imkanlarıyla harmanlıyoruz.
          </p>
        </header>

        {/* Quest Scroll - Main Mission */}
        <section className="mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary font-serif font-bold">
                  I
                </span>
                <h2 className="text-2xl lg:text-3xl font-bold font-serif">Ana Görev: Erişilebilirlik</h2>
              </div>
              
              <div className="space-y-5 text-lg text-foreground-secondary leading-relaxed">
                <p>
                  Game Master olmak sanattır. Kuralları bilmek, hikaye kurmak, karakterlere hayat vermek...
                  Bu yükü taşıyacak birini bulmak her zaman kolay değildir.
                </p>
                <p>
                  <strong className="text-foreground">GameMaster AI</strong> ile bu engeli kaldırıyoruz.
                  Artık herkes, her an, epik maceralara atılabilir. Hazırlık yok, bekleme yok.
                  <span className="text-primary"> Sadece saf hikaye anlatımı.</span>
                </p>
              </div>
            </div>

            {/* Quest Card */}
            <div className="relative">
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-75" />
              
              <div className="relative bg-background-elevated border border-border/50 rounded-lg p-8 shadow-xl">
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary/40" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary/40" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary/40" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary/40" />

                <div className="text-center mb-6 pb-6 border-b border-border/50">
                  <Compass className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-serif font-bold tracking-wide">GÖREV DETAYLARI</h3>
                </div>

                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-foreground-muted">Tür</span>
                    <span className="text-primary font-medium">Ana Kampanya</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-foreground-muted">Zorluk</span>
                    <span className="text-secondary font-medium">Efsanevi</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-foreground-muted">Ödül</span>
                    <span className="text-foreground font-medium">Sınırsız Macera</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                  <div className="text-xs text-foreground-muted uppercase tracking-widest mb-2">Durum</div>
                  <div className="inline-flex items-center gap-2 text-accent font-bold">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    AKTİF
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-24 lg:mb-32">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary font-serif font-bold">
                II
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold font-serif">Parti Yetenekleri</h2>
            </div>
            <p className="text-foreground-secondary">Bizi biz yapan değerler</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                className="group relative bg-background-elevated/50 rounded-xl p-8 border border-border/30 hover:border-primary/30 transition-all duration-300"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-transform group-hover:scale-110 duration-300 ${
                  value.color === 'primary' ? 'bg-primary/10 border border-primary/20' :
                  value.color === 'secondary' ? 'bg-secondary/10 border border-secondary/20' :
                  'bg-accent/10 border border-accent/20'
                }`}>
                  <value.icon className={`w-7 h-7 ${
                    value.color === 'primary' ? 'text-primary' :
                    value.color === 'secondary' ? 'text-secondary' :
                    'text-accent'
                  }`} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 font-serif">{value.title}</h3>
                <p className="text-foreground-secondary leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Section */}
        <section>
          <div className="relative max-w-4xl mx-auto">
            {/* Background card */}
            <div className="bg-gradient-to-br from-background-elevated to-background-tertiary rounded-xl border border-border/50 p-10 lg:p-14 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-serif font-bold text-sm">
                    III
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-bold font-serif">Arcane Technology</h2>
                </div>
                
                <p className="text-foreground-secondary mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                  LLM motorları, vektör veritabanları ve prosedürel üretim algoritmaları...
                  <span className="block mt-2 text-primary/80 italic">&quot;Yeterince gelişmiş teknoloji, büyüden ayırt edilemez.&quot;</span>
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { name: "GPT-4o", highlight: true },
                    { name: "Vector DB" },
                    { name: "Next.js 15" },
                    { name: "D&D 5e SRD" },
                    { name: "WebGL" },
                  ].map((tech) => (
                    <span
                      key={tech.name}
                      className={`px-5 py-2.5 rounded-lg font-mono text-sm transition-all duration-300 hover:scale-105 ${
                        tech.highlight
                          ? 'bg-primary/10 border border-primary/30 text-primary'
                          : 'bg-background-secondary border border-border/50 text-foreground-secondary hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
