"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Textarea, Input } from "@/components/ui";
import { 
  Wand2, 
  RefreshCw, 
  Check, 
  Edit3, 
  Sparkles,
  Globe,
  MapPin,
  Swords,
  Users,
  BookOpen,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { post } from "@/lib/api/client";

interface WorldSettings {
  worldName: string;
  worldType: string;
  setting: string;
  era: string;
  startingLocation: {
    name: string;
    description: string;
    atmosphere: string;
  };
  tone: string;
  mainConflict: string;
  uniqueElements: string[];
  factions: Array<{
    name: string;
    description: string;
    alignment: string;
  }>;
  hooks: string[];
  openingNarration: string;
}

interface GameSetupWizardProps {
  campaignName: string;
  campaignDescription?: string;
  onComplete: (settings: WorldSettings) => void;
  onSkip?: () => void;
}

const worldTypes = [
  { id: 'fantasy', label: 'Fantezi', icon: '🏰', desc: 'Büyü, ejderhalar, elfler' },
  { id: 'dark-fantasy', label: 'Karanlık Fantezi', icon: '🌑', desc: 'Gotik, korku unsurları' },
  { id: 'sci-fi', label: 'Bilim Kurgu', icon: '🚀', desc: 'Uzay, teknoloji, gelecek' },
  { id: 'steampunk', label: 'Steampunk', icon: '⚙️', desc: 'Buhar gücü, mekanik' },
  { id: 'historical', label: 'Tarihi', icon: '📜', desc: 'Gerçek tarih dönemleri' },
  { id: 'modern', label: 'Modern', icon: '🌆', desc: 'Günümüz dünyası' },
];

const toneOptions = [
  { id: 'epic', label: 'Epik', desc: 'Destansı maceralar' },
  { id: 'serious', label: 'Ciddi', desc: 'Gerçekçi ve ağır' },
  { id: 'mysterious', label: 'Gizemli', desc: 'Sırlar ve keşifler' },
  { id: 'comedic', label: 'Komedi', desc: 'Eğlenceli ve hafif' },
  { id: 'dark', label: 'Karanlık', desc: 'Korku ve gerilim' },
];

export function GameSetupWizard({ 
  campaignName, 
  campaignDescription,
  onComplete,
  onSkip 
}: GameSetupWizardProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'review' | 'edit'>('input');
  const [selectedWorldType, setSelectedWorldType] = useState<string>('fantasy');
  const [selectedTone, setSelectedTone] = useState<string>('epic');
  const [userInput, setUserInput] = useState('');
  const [worldSettings, setWorldSettings] = useState<WorldSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const generateWorld = async (regenerate = false) => {
    setIsLoading(true);
    setStep('generating');

    try {
      const response = await post<{ success: boolean; worldSettings: WorldSettings }>('/gm/generate-world', {
        campaignName,
        campaignDescription,
        worldType: selectedWorldType,
        userInput: userInput || undefined,
        currentSettings: regenerate ? worldSettings : undefined,
      });

      if (response.success && response.worldSettings) {
        setWorldSettings(response.worldSettings);
        setStep('review');
      }
    } catch (error) {
      console.error('Dünya oluşturma hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (worldSettings) {
      onComplete(worldSettings);
    }
  };

  const updateField = (field: string, value: any) => {
    if (!worldSettings) return;
    
    const keys = field.split('.');
    const newSettings = { ...worldSettings };
    
    if (keys.length === 1) {
      (newSettings as any)[keys[0]] = value;
    } else if (keys.length === 2) {
      (newSettings as any)[keys[0]] = {
        ...(newSettings as any)[keys[0]],
        [keys[1]]: value
      };
    }
    
    setWorldSettings(newSettings);
    setEditingField(null);
  };

  // Step 1: Giriş
  if (step === 'input') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Globe className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Dünya Kurulumu</h2>
          <p className="text-foreground-secondary">
            Maceranın geçeceği dünyayı oluşturalım. AI size önerilerde bulunacak.
          </p>
        </div>

        {/* Dünya Tipi Seçimi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dünya Tipi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {worldTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedWorldType(type.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    selectedWorldType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-2 block">{type.icon}</span>
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-foreground-muted">{type.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ton Seçimi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hikaye Tonu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={cn(
                    "px-4 py-2 rounded-full border transition-all",
                    selectedTone === tone.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Kullanıcı Girişi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Fikrin Var mı? (Opsiyonel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Örnek: Deniz kıyısında bir liman şehri olsun, korsan temalı bir macera istiyorum..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-foreground-muted mt-2">
              Bir fikir yazarsan AI onu geliştirip detaylandıracak. Boş bırakırsan sıfırdan önerecek.
            </p>
          </CardContent>
        </Card>

        {/* Butonlar */}
        <div className="flex gap-3">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} className="flex-1">
              Atla (Varsayılan Ayarlar)
            </Button>
          )}
          <Button onClick={() => generateWorld()} className="flex-1 gap-2">
            <Wand2 className="h-4 w-4" />
            AI ile Dünya Oluştur
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Oluşturuluyor
  if (step === 'generating') {
    return (
      <div className="max-w-md mx-auto text-center py-16 animate-fade-in">
        <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
          <Wand2 className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <h2 className="text-xl font-bold mb-2">Dünya Oluşturuluyor...</h2>
        <p className="text-foreground-secondary mb-4">
          AI maceranız için özel bir dünya tasarlıyor
        </p>
        <div className="flex justify-center gap-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  // Step 3 & 4: İnceleme ve Düzenleme
  if ((step === 'review' || step === 'edit') && worldSettings) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{worldSettings.worldName}</h2>
          <div className="flex justify-center gap-2">
            <Badge variant="primary">{worldSettings.worldType}</Badge>
            <Badge variant="secondary">{worldSettings.tone}</Badge>
          </div>
        </div>

        {/* Dünya Genel Bakış */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Dünya Tanımı
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingField('setting')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingField === 'setting' ? (
              <div className="space-y-2">
                <Textarea
                  value={worldSettings.setting}
                  onChange={(e) => setWorldSettings({ ...worldSettings, setting: e.target.value })}
                  rows={3}
                />
                <Button size="sm" onClick={() => setEditingField(null)}>
                  <Check className="h-4 w-4 mr-1" /> Tamam
                </Button>
              </div>
            ) : (
              <>
                <p className="text-foreground-secondary">{worldSettings.setting}</p>
                <p className="text-sm text-foreground-muted mt-2">
                  <strong>Çağ:</strong> {worldSettings.era}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Başlangıç Lokasyonu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Başlangıç Lokasyonu: {worldSettings.startingLocation.name}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingField('startingLocation.description')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingField === 'startingLocation.description' ? (
              <div className="space-y-2">
                <Input
                  value={worldSettings.startingLocation.name}
                  onChange={(e) => updateField('startingLocation.name', e.target.value)}
                  placeholder="Lokasyon adı"
                  className="mb-2"
                />
                <Textarea
                  value={worldSettings.startingLocation.description}
                  onChange={(e) => setWorldSettings({
                    ...worldSettings,
                    startingLocation: { ...worldSettings.startingLocation, description: e.target.value }
                  })}
                  rows={3}
                />
                <Button size="sm" onClick={() => setEditingField(null)}>
                  <Check className="h-4 w-4 mr-1" /> Tamam
                </Button>
              </div>
            ) : (
              <>
                <p className="text-foreground-secondary">{worldSettings.startingLocation.description}</p>
                <Badge variant="outline" className="mt-2">
                  {worldSettings.startingLocation.atmosphere}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ana Çatışma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-danger" />
              Ana Çatışma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground-secondary">{worldSettings.mainConflict}</p>
          </CardContent>
        </Card>

        {/* Gruplar/Factions */}
        {worldSettings.factions && worldSettings.factions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gruplar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {worldSettings.factions.map((faction, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background-elevated">
                    <div className="flex-1">
                      <p className="font-medium">{faction.name}</p>
                      <p className="text-sm text-foreground-muted">{faction.description}</p>
                    </div>
                    <Badge 
                      variant={
                        faction.alignment === 'friendly' ? 'success' :
                        faction.alignment === 'hostile' ? 'danger' : 'default'
                      }
                    >
                      {faction.alignment === 'friendly' ? 'Dost' :
                       faction.alignment === 'hostile' ? 'Düşman' : 'Nötr'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Açılış Anlatısı */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Açılış Anlatısı
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingField('openingNarration')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingField === 'openingNarration' ? (
              <div className="space-y-2">
                <Textarea
                  value={worldSettings.openingNarration}
                  onChange={(e) => setWorldSettings({ ...worldSettings, openingNarration: e.target.value })}
                  rows={5}
                />
                <Button size="sm" onClick={() => setEditingField(null)}>
                  <Check className="h-4 w-4 mr-1" /> Tamam
                </Button>
              </div>
            ) : (
              <p className="text-foreground-secondary italic leading-relaxed">
                "{worldSettings.openingNarration}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Aksiyon Butonları */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => generateWorld(true)}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Yeniden Oluştur
          </Button>
          <Button 
            onClick={handleComplete}
            className="flex-1 gap-2"
          >
            <Check className="h-4 w-4" />
            Onayla ve Başla
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

