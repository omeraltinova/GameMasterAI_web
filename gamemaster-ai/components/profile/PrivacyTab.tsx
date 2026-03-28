"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  Eye,
  Globe,
  Users,
  Swords,
  Scroll,
  BarChart3,
  Save,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyState {
  profilePublic: boolean;
  showCharacters: boolean;
  showCampaigns: boolean;
  showScenarios: boolean;
  showStats: boolean;
}

interface PrivacyTabProps {
  privacy: PrivacyState;
  privacyLoaded: boolean;
  isSavingPrivacy: boolean;
  onPrivacyChange: (privacy: PrivacyState) => void;
  onSave: () => void;
  onPreview: () => void;
}

function PrivacyToggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-background-elevated">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-foreground-secondary shrink-0" />
        <div>
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-foreground-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-primary" : "bg-foreground-muted/30"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export function PrivacyTab({
  privacy,
  privacyLoaded,
  isSavingPrivacy,
  onPrivacyChange,
  onSave,
  onPreview,
}: PrivacyTabProps) {
  const setField = (key: keyof PrivacyState, value: boolean) => {
    onPrivacyChange({ ...privacy, [key]: value });
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Profil Gizliliği
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        {!privacyLoaded ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-foreground-muted">
              Profilinin diğer oyunculara nasıl göründüğünü kontrol et.
            </p>

            <div className="p-4 sm:p-5 rounded-xl bg-background-elevated border border-border/50">
              <PrivacyToggle
                icon={Globe}
                label="Profil Herkese Açık"
                description="Kapatırsan profilin sadece sana görünür"
                checked={privacy.profilePublic}
                onChange={(v) => setField("profilePublic", v)}
              />
            </div>

            <div
              className={cn(
                "space-y-3 pl-2 sm:pl-6 border-l-2 border-primary/20 transition-all duration-300",
                !privacy.profilePublic &&
                  "opacity-40 pointer-events-none grayscale"
              )}
            >
              <PrivacyToggle
                icon={Users}
                label="Karakterleri Göster"
                description="Karakter listenin profilinde gözükmesi"
                checked={privacy.showCharacters}
                onChange={(v) => setField("showCharacters", v)}
              />
              <PrivacyToggle
                icon={Swords}
                label="Oturumları Göster"
                description="Oturum listenin profilinde gözükmesi"
                checked={privacy.showCampaigns}
                onChange={(v) => setField("showCampaigns", v)}
              />
              <PrivacyToggle
                icon={Scroll}
                label="Senaryoları Göster"
                description="Oluşturduğun senaryoların profilinde gözükmesi"
                checked={privacy.showScenarios}
                onChange={(v) => setField("showScenarios", v)}
              />
              <PrivacyToggle
                icon={BarChart3}
                label="İstatistikleri Göster"
                description="Zar, mesaj ve başarım istatistiklerinin gözükmesi"
                checked={privacy.showStats}
                onChange={(v) => setField("showStats", v)}
              />
            </div>

            <Button
              variant="outline"
              onClick={onPreview}
              className="gap-2 w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Herkese Açık Önizleme
            </Button>

            <Button
              onClick={onSave}
              isLoading={isSavingPrivacy}
              className="gap-2 w-full sm:w-auto mt-4"
            >
              <Save className="h-4 w-4" />
              Gizlilik Ayarlarını Kaydet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
