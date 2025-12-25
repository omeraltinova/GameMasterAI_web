import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import {
  Sword,
  Sparkles,
  Users,
  Dice6,
  Map,
  BookOpen,
  Zap,
  Shield,
  ArrowRight,
  Play,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Game Master",
    description: "Yapay zeka destekli hikaye anlatımı, NPC diyalogları ve dinamik olay yönetimi.",
  },
  {
    icon: Sword,
    title: "D&D 5e Uyumlu",
    description: "Resmi D&D 5e kurallarına uygun karakter sistemi ve oyun mekanikleri.",
  },
  {
    icon: Users,
    title: "Tek & Çok Oyunculu",
    description: "Solo maceralar veya arkadaşlarınızla birlikte epik kampanyalar.",
  },
  {
    icon: Dice6,
    title: "Zar Sistemi",
    description: "Tüm D&D zarları ile otomatik hesaplama ve animasyonlu atışlar.",
  },
  {
    icon: Map,
    title: "Dinamik Haritalar",
    description: "AI tarafından oluşturulan atmosferik mekan görselleri.",
  },
  {
    icon: BookOpen,
    title: "Senaryo Kütüphanesi",
    description: "Hazır senaryolar veya kendi maceralarınızı oluşturun.",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Karakter Oluştur",
    description: "Irk, sınıf ve yeteneklerini seçerek benzersiz bir kahraman yarat.",
  },
  {
    step: 2,
    title: "Kampanya Başlat",
    description: "Bir senaryo seç veya AI'dan yeni bir macera oluşturmasını iste.",
  },
  {
    step: 3,
    title: "Maceraya Atıl",
    description: "AI Game Master rehberliğinde epik hikayeler yaz ve dünyayı keşfet.",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI Destekli D&D Deneyimi</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">Yapay Zeka</span>
            <br />
            <span className="text-foreground">Game Master&apos;ınız</span>
          </h1>

          <p className="text-xl text-foreground-secondary max-w-2xl mx-auto mb-10">
            D&D 5e kurallarıyla çalışan, hikayenizi dinamik olarak şekillendiren
            AI destekli rol yapma oyunu deneyimi.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 animate-pulse-glow">
                Maceraya Başla
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Demo İzle
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { value: "10+", label: "Irk Seçeneği" },
              { value: "12+", label: "Sınıf" },
              { value: "∞", label: "Hikaye Olasılığı" },
              { value: "24/7", label: "AI Erişimi" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-foreground-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Güçlü Özellikler</span>
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Masa üstü rol yapma deneyimini dijital dünyaya taşıyan kapsamlı özellik seti.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card key={i} hover className="group">
                  <CardContent className="p-6">
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-foreground-secondary text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Nasıl Çalışır?</span>
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Sadece üç adımda maceraya atılın.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary text-primary text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-foreground-secondary">{item.description}</p>

                {/* Connector Line */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background-secondary">
        <div className="container mx-auto px-4">
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10" />
            <CardContent className="relative p-12 text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Epik Maceralar Sizi Bekliyor
              </h2>
              <p className="text-foreground-secondary max-w-xl mx-auto mb-8">
                Hemen ücretsiz hesap oluşturun ve AI destekli D&D deneyiminin keyfini çıkarın.
              </p>
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Ücretsiz Başla
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}


