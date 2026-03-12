"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from "@/components/ui";
import { ArrowLeft, Users, Ticket, Search, Play, Loader2 } from "lucide-react";
import { post } from "@/lib/api/client";

export default function JoinCampaignPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  // Format invite code: ABCD-1234
  const formatInviteCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (cleaned.length > 4) {
      return cleaned.slice(0, 4) + "-" + cleaned.slice(4);
    }
    return cleaned;
  };

  const rawCode = inviteCode.replace(/-/g, "");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [foundCampaign, setFoundCampaign] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSearching(true);
    setFoundCampaign(null);

    try {
      const response = await post('/campaigns/join', { inviteCode: rawCode }) as any;
      
      if (response && response.success) {
        setFoundCampaign(response.campaign);
      } else {
        setError(response?.error || "Geçersiz davet kodu. Lütfen kontrol edip tekrar deneyin.");
      }
    } catch (err: any) {
      setError(err?.message || "Oturum aranırken bir hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinCampaign = () => {
    if (foundCampaign) {
      router.push(`/campaigns/${foundCampaign.id}?inviteCode=${encodeURIComponent(rawCode)}`);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/campaigns">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
      </Link>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Oturuma Katıl</h1>
        <p className="text-foreground-secondary">
          Arkadaşının paylaştığı davet kodunu gir
        </p>
      </div>

      {/* Join Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-primary" />
            Davet Kodu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="ABCD-1234"
              value={inviteCode}
              onChange={(e) => {
                const formatted = formatInviteCode(e.target.value.toUpperCase());
                setInviteCode(formatted);
                setError("");
                setFoundCampaign(null);
              }}
              maxLength={9}
              error={error}
              className="text-center font-mono text-2xl tracking-[0.3em] uppercase"
            />

            <Button
              type="submit"
              className="w-full gap-2"
              isLoading={isSearching}
              disabled={!rawCode || rawCode.length < 4}
            >
              <Search className="h-4 w-4" />
              Oturumu Bul
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Found Campaign */}
      {foundCampaign && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Oturum Bulundu!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">{foundCampaign.name}</h3>
              {foundCampaign.description && (
                <p className="text-sm text-foreground-secondary mt-1">
                  {foundCampaign.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Kurucu: {foundCampaign.creatorName}
              </Badge>
              <Badge variant="outline">
                {foundCampaign.playerCount}/{foundCampaign.maxPlayers} Oyuncu
              </Badge>
              {foundCampaign.scenarioTitle && (
                <Badge variant="secondary">
                  {foundCampaign.scenarioTitle}
                </Badge>
              )}
            </div>

            {foundCampaign.isAlreadyPlayer ? (
              <Button onClick={handleJoinCampaign} className="w-full gap-2">
                <Play className="h-4 w-4" />
                Lobiye Git
              </Button>
            ) : foundCampaign.isFull ? (
              <Button disabled className="w-full">
                Oturum Dolu
              </Button>
            ) : (
              <Button onClick={handleJoinCampaign} className="w-full gap-2">
                <Users className="h-4 w-4" />
                Lobiye Katıl
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="p-4 rounded-lg bg-background-elevated text-center">
        <p className="text-sm text-foreground-secondary">
          Davet kodu, oturum sahibi tarafından paylaşılır. Oturum lobisinde
          davet kodunu bulabilirsin.
        </p>
      </div>
    </div>
  );
}
