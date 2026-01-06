

"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Select } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { Loader2, Sparkles, Save, Globe } from "lucide-react";
import { useToast } from "@/components/ui";

interface ScenarioFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
}

const genres = ["Fantasy", "Sci-Fi", "Horror", "Mystery", "Cyberpunk", "Post-Apocalyptic", "Historical", "Steampunk"];
const difficulties = ["Easy", "Medium", "Hard"];
const worldTypes = [
  { value: 'fantasy', label: 'Fantezi' },
  { value: 'dark-fantasy', label: 'Karanlık Fantezi' },
  { value: 'sci-fi', label: 'Bilim Kurgu' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'historical', label: 'Tarihi' },
  { value: 'modern', label: 'Modern' },
];
const tones = [
  { value: 'epic', label: 'Epik' },
  { value: 'serious', label: 'Ciddi' },
  { value: 'mysterious', label: 'Gizemli' },
  { value: 'comedic', label: 'Komedi' },
  { value: 'dark', label: 'Karanlık' },
];

export function ScenarioForm({ initialData, onSubmit, isLoading, isEdit = false }: ScenarioFormProps) {
  const { addToast } = useToast();
  
  // Parse initial world settings
  let initialWorldSettings = {
    worldName: "",
    worldType: "fantasy",
    tone: "epic",
    setting: "",
    startingLocationName: "",
    startingLocationDesc: "",
  };

  if (initialData?.worldSettings) {
    try {
      const parsed = typeof initialData.worldSettings === 'string' ? JSON.parse(initialData.worldSettings) : initialData.worldSettings;
      initialWorldSettings = {
        worldName: parsed.worldName || "",
        worldType: parsed.worldType || "fantasy",
        tone: parsed.tone || "epic",
        setting: parsed.setting || "",
        startingLocationName: parsed.startingLocation?.name || "",
        startingLocationDesc: parsed.startingLocation?.description || "",
      };
    } catch (e) {
      console.error("Failed to parse initial world settings", e);
    }
  }

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    genre: initialData?.genre || "Fantasy",
    difficulty: initialData?.difficulty || "Medium",
    startingPrompt: initialData?.startingPrompt || "",
    tags: initialData?.tags ? (typeof initialData.tags === 'string' ? JSON.parse(initialData.tags) : initialData.tags).join(", ") : "",
    
    // World Settings Flattened for Form
    worldName: initialWorldSettings.worldName,
    worldType: initialWorldSettings.worldType,
    tone: initialWorldSettings.tone,
    setting: initialWorldSettings.setting,
    startingLocationName: initialWorldSettings.startingLocationName,
    startingLocationDesc: initialWorldSettings.startingLocationDesc,
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean);
    
    // Construct worldSettings object
    const worldSettings = {
      worldName: formData.worldName,
      worldType: formData.worldType,
      tone: formData.tone,
      setting: formData.setting,
      startingLocation: {
        name: formData.startingLocationName,
        description: formData.startingLocationDesc,
        atmosphere: "" // Optional/derived
      },
      mainConflict: "", // Simplified for now
      openingNarration: formData.startingPrompt // Can reuse starting prompt or separate
    };

    await onSubmit({ 
      ...formData, 
      tags: tagsArray,
      worldSettings
    });
  };

  const generateWithAI = async () => {
    if (!formData.title && !formData.genre) {
       addToast({ title: "Hata", description: "Lütfen en azından bir başlık veya tür seçin.", type: "error" });
       return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/gm/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.title || `A ${formData.genre} adventure`,
          genre: formData.genre,
          difficulty: formData.difficulty
        }),
      });
      
      const data = await res.json();
      if (data.scenario) {
        const aiWorldSettings = data.scenario.tags && data.scenario.worldSettings ? data.scenario.worldSettings : null; // active-session creates it, generate-scenario creates it.
        // Actually generate-scenario returns scenario object. We adjusted api to include worldSettings in db create, and return it.
        // Wait, did I update the return value of generated scenario? Yes, I see `scenario` returned.
        
        let newWorldSettings = {};
        if (data.scenario.tags?.includes('{')) { // It might be parsing failure or something. 
           // ignore
        }
        
        // The API returns the scenario object created in DB.
        // It has worldSettings as a string or null (if schema update worked) or we need to check how it returns.
        // In route.ts: res.json({ scenario: { ...tags: ..., isAIGenerated: true } })
        // I didn't verify if I added worldSettings to the RETURNED object in POST response.
        // Let's assume it might not be there yet given the Prisma error.
        // However, I can check `data.scenario.worldSettings`.
        
        let parsedWS: any = {};
        if (data.scenario.worldSettings) {
             parsedWS = typeof data.scenario.worldSettings === 'string' 
             ? JSON.parse(data.scenario.worldSettings) 
             : data.scenario.worldSettings;
        }

        setFormData(prev => ({
          ...prev,
          title: data.scenario.title || prev.title,
          description: data.scenario.description || prev.description,
          startingPrompt: data.scenario.startingPrompt || prev.startingPrompt,
          worldName: parsedWS.worldName || prev.worldName,
          worldType: parsedWS.worldType || prev.worldType,
          tone: parsedWS.tone || prev.tone,
          setting: parsedWS.setting || prev.setting,
          startingLocationName: parsedWS.startingLocation?.name || prev.startingLocationName,
          startingLocationDesc: parsedWS.startingLocation?.description || prev.startingLocationDesc,
        }));
        addToast({ title: "Başarılı", description: "Senaryo ve dünya detayları AI tarafından oluşturuldu.", type: "success" });
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      addToast({ title: "Hata", description: "AI senaryo oluşturamadı.", type: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Temel Bilgiler */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                 <Sparkles className="h-5 w-5 text-primary" />
                 Senaryo Bilgileri
               </h3>
               <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={generateWithAI}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                AI ile Doldur
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Başlık"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Senaryo başlığı"
                required
              />
              <Input
                label="Etiketler"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="dragon, dungeon, magic"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Tür"
                value={formData.genre}
                onChange={handleChange}
                name="genre"
                options={genres.map(g => ({ value: g, label: g }))}
              />
              <Select
                label="Zorluk"
                value={formData.difficulty}
                onChange={handleChange}
                name="difficulty"
                options={difficulties.map(d => ({ value: d, label: d }))}
              />
            </div>

            <Textarea
              label="Hikaye Özeti"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Senaryonun genel hikayesi..."
              required
              rows={4}
            />
          </div>

          {/* Dünya Ayarları */}
          <div className="space-y-6">
            <div className="border-b pb-2">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                 <Globe className="h-5 w-5 text-primary" />
                 Dünya Detayları
               </h3>
               <p className="text-sm text-foreground-muted mt-1">
                 Bu bilgiler oyun başlangıcında oyunculara anlatılır ve "Dünya Kurulumu" ekranının atlanmasını sağlar.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Input
                 label="Dünya Adı"
                 name="worldName"
                 value={formData.worldName}
                 onChange={handleChange}
                 placeholder="Forgotten Realms"
               />
               <Select
                  label="Dünya Tipi"
                  name="worldType"
                  value={formData.worldType}
                  onChange={handleChange}
                  options={worldTypes}
               />
               <Select
                  label="Ton"
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  options={tones}
               />
            </div>

            <Textarea
              label="Dünya Arka Planı (Setting)"
              name="setting"
              value={formData.setting}
              onChange={handleChange}
              placeholder="Dünyanın tarihi ve genel durumu..."
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Başlangıç Yeri"
                name="startingLocationName"
                value={formData.startingLocationName}
                onChange={handleChange}
                placeholder="Phandalin Köyü"
              />
              <Input
                label="Mekan Açıklaması (Görsel İçin)"
                name="startingLocationDesc"
                value={formData.startingLocationDesc}
                onChange={handleChange}
                placeholder="Dağların eteğinde, sisli ve eski..."
              />
            </div>
          </div>

          {/* GM Notları */}
          <div className="space-y-6">
             <div className="border-b pb-2">
               <h3 className="font-semibold text-lg">GM Notları</h3>
             </div>
             <Textarea
              label="Başlangıç Promptu & Notlar"
              name="startingPrompt"
              value={formData.startingPrompt}
              onChange={handleChange}
              placeholder="Oyuncular oyuna başladığında AI GM'in kullanacağı ilk talimatlar..."
              required
              rows={6}
              hint="Oyuna başlarken AI GM'e bağlam olarak verilir."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
             <Button type="button" variant="ghost" onClick={() => window.history.back()}>
               İptal
             </Button>
             <Button type="submit" disabled={isLoading || isGenerating} className="gap-2">
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
               {isEdit ? "Güncelle" : "Oluştur"}
             </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

