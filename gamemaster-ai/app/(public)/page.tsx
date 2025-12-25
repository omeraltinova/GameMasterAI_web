"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { FadeInView, StaggerContainer, StaggerItem } from "@/components/layout/PageTransition";
import {
  Sword,
  Sparkles,
  Users,
  Dice6,
  Map,
  BookOpen,
  Scroll,
  Crown,
  ArrowRight,
  Play,
  Flame,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/6 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent/5 blur-[100px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 lg:pt-24 lg:pb-20 container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left z-10">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-primary/5 border border-primary/20 mb-8"
            >
              <Flame className="h-3.5 w-3.5 text-primary animate-torch" />
              <span className="text-xs font-medium text-primary tracking-[0.2em] uppercase">Yeni Nesil TTRPG</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
            >
              <span className="block text-foreground/90">Efsanevi</span>
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-secondary">
                Maceralar
              </span>
              <span className="block mt-2 text-foreground/80 text-[0.7em]">AI Rehberliğinde</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-foreground-secondary mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Sınırsız hayal gücü, dinamik hikaye anlatımı ve D&D 5e kurallarına tam sadakat.
              Masaüstü rol yapma oyunlarını yeniden keşfet.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/register">
                <Button size="lg" className="h-14 px-10 text-base font-semibold relative overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-2">
                    Maceraya Başla
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="h-14 px-10 text-base border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all">
                  <Play className="mr-2 h-4 w-4" />
                  Demo İzle
                </Button>
              </Link>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-14 pt-8 border-t border-border/30 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0"
            >
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-primary font-serif">5e</div>
                <div className="text-xs text-foreground-muted uppercase tracking-wider mt-1">Tam Uyumlu</div>
              </div>
              <div className="text-center lg:text-left border-l border-border/30 pl-6">
                <div className="text-3xl font-bold text-foreground font-serif">∞</div>
                <div className="text-xs text-foreground-muted uppercase tracking-wider mt-1">Senaryo</div>
              </div>
              <div className="text-center lg:text-left border-l border-border/30 pl-6">
                <div className="text-3xl font-bold text-foreground font-serif">7/24</div>
                <div className="text-xs text-foreground-muted uppercase tracking-wider mt-1">Hazır</div>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Game Session Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 w-full max-w-[560px] lg:max-w-none relative"
          >
            {/* Glow behind card */}
            <div className="absolute inset-4 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 rounded-lg blur-2xl" />
            
            {/* Main Card */}
            <div className="relative bg-background-elevated/90 backdrop-blur border border-border/50 rounded-lg overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-background-tertiary border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/80" />
                </div>
                <div className="text-xs font-mono text-foreground-muted tracking-wide">campaign_session.log</div>
                <div className="w-16" />
              </div>

              {/* Chat Content */}
              <div className="p-5 space-y-4 font-mono text-sm">
                <div className="flex gap-3">
                  <span className="text-primary font-bold shrink-0 w-12">GM:</span>
                  <span className="text-foreground-secondary leading-relaxed">
                    Eski tapınağın kapıları gıcırdayarak açılıyor. İçeriden soğuk, nemli bir hava yüzünüze çarpıyor...
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <span className="text-accent font-bold shrink-0 w-12">Sen:</span>
                  <span className="text-foreground-secondary leading-relaxed">
                    Meşalemi yakıp girişteki oymaları inceliyorum.
                  </span>
                </div>
                
                {/* Dice Roll */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded border border-primary/20">
                  <Dice6 className="h-5 w-5 text-primary" />
                  <span className="text-foreground-muted">Perception Check</span>
                  <span className="ml-auto font-bold text-primary text-lg">18</span>
                </div>
                
                <div className="flex gap-3">
                  <span className="text-primary font-bold shrink-0 w-12">GM:</span>
                  <span className="text-foreground-secondary leading-relaxed">
                    Oymaların ejderha kültüne ait eski rünler olduğunu fark ediyorsun. Antik bir dil, çoğu silinmiş ama...
                  </span>
                </div>

                {/* Typing indicator */}
                <div className="flex gap-3 items-center">
                  <span className="text-primary font-bold shrink-0 w-12">GM:</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 container mx-auto px-4 relative">
        <FadeInView className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 mb-6">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">
            Oyunun <span className="text-primary">Evrimi</span>
          </h2>
          <p className="text-foreground-secondary text-lg">
            Geleneksel rol yapma keyfini çağdaş teknoloji ile harmanlıyoruz.
          </p>
        </FadeInView>

        {/* Bento Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-6 gap-4 lg:gap-5" delay={0.2}>
          {/* Large Card - AI GM */}
          <StaggerItem className="md:col-span-4 group relative bg-gradient-to-br from-background-elevated to-background-tertiary rounded-xl border border-border/50 p-8 hover:border-primary/30 transition-all duration-500 overflow-hidden min-h-[280px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-serif">AI Game Master</h3>
              <p className="text-foreground-secondary max-w-md leading-relaxed">
                Her karara uyum sağlayan, sonsuz senaryo üretebilen ve kuralları kusursuz uygulayan bir anlatıcı. 
                Dilediğin zaman, dilediğin yerde.
              </p>
            </div>
          </StaggerItem>

          {/* Tall Card - Dynamic Worlds */}
          <StaggerItem className="md:col-span-2 md:row-span-2 group bg-background-elevated rounded-xl border border-border/50 p-6 hover:border-accent/30 transition-all duration-300 flex flex-col">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 mb-5">
              <Map className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2 font-serif">Dinamik Dünyalar</h3>
            <p className="text-foreground-secondary text-sm mb-6 flex-1 leading-relaxed">
              Gittiğiniz her yer anlık olarak görselleştirilir ve betimlenir.
            </p>
            
            {/* Abstract Map Visual */}
            <div className="h-40 rounded-lg bg-background-tertiary border border-border/30 relative overflow-hidden">
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 left-4 w-6 h-6 rounded bg-primary/20" 
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-accent/20" />
              <div className="absolute bottom-6 right-6 w-4 h-4 rounded-full bg-secondary/30" />
              <div className="absolute top-8 right-8 w-3 h-3 rounded bg-accent/40" />
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground-muted" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-foreground-muted" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-foreground-muted" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-foreground-muted" />
              </div>
            </div>
          </StaggerItem>

          {/* Small Card - Dice */}
          <StaggerItem className="md:col-span-2 group bg-background-elevated rounded-xl border border-border/50 p-6 hover:border-primary/30 transition-all duration-300">
            <Dice6 className="w-8 h-8 text-primary mb-4 group-hover:rotate-12 transition-transform duration-300" />
            <h3 className="text-lg font-bold mb-1 font-serif">Zar Motoru</h3>
            <p className="text-sm text-foreground-secondary">Fizik tabanlı gerçekçi atışlar.</p>
          </StaggerItem>

          {/* Small Card - Rules */}
          <StaggerItem className="md:col-span-2 group bg-background-elevated rounded-xl border border-border/50 p-6 hover:border-secondary/30 transition-all duration-300">
            <BookOpen className="w-8 h-8 text-secondary mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-lg font-bold mb-1 font-serif">5e Kütüphanesi</h3>
            <p className="text-sm text-foreground-secondary">Büyüler, yaratıklar, eşyalar.</p>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        
        <div className="container mx-auto px-4 relative">
          <FadeInView className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/20 mb-6">
              <Scroll className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">
              Macera <span className="text-secondary">Nasıl Başlar?</span>
            </h2>
          </FadeInView>

          <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto" delay={0.1}>
            {[
              { step: 1, title: "Kahraman Yarat", desc: "Irk, sınıf ve yeteneklerini seç. Hikayeni şekillendir.", icon: Shield },
              { step: 2, title: "Kampanya Seç", desc: "Hazır senaryolar veya AI'dan yeni bir macera iste.", icon: Map },
              { step: 3, title: "Oyna", desc: "AI Game Master rehberliğinde epik hikayeler yaz.", icon: Sword },
            ].map((item, i) => (
              <StaggerItem key={i} className="relative group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-border/50 to-transparent" />
                )}
                
                <div className="bg-background-elevated/50 rounded-xl border border-border/30 p-6 hover:border-primary/20 transition-all duration-300 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-5 relative">
                    <item.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 font-serif">{item.title}</h3>
                  <p className="text-sm text-foreground-secondary">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 relative">
        <div className="container mx-auto px-4">
          <FadeInView className="max-w-3xl mx-auto relative">
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30" />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30" />
            
            <div className="bg-gradient-to-b from-background-elevated to-background-tertiary rounded-xl border border-border/50 p-10 lg:p-14 text-center relative overflow-hidden">
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
              
              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 font-serif">
                  Kendi Efsaneni Yaz
                </h2>
                <p className="text-foreground-secondary mb-8 max-w-lg mx-auto text-lg">
                  Hesabını oluştur, karakterini yarat ve ilk kampanyanı dakikalar içinde başlat.
                </p>
                <Link href="/register">
                  <Button size="lg" className="h-14 px-12 text-base font-semibold gap-2">
                    Ücretsiz Başla
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>
    </div>
  );
}
