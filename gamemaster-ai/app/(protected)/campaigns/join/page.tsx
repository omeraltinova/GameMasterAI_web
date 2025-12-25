"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { ArrowLeft, Users, Ticket, Search } from "lucide-react";

export default function JoinCampaignPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSearching(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation
    if (inviteCode.toUpperCase() === "MINE2024") {
      router.push("/campaigns/camp_1");
    } else {
      setError("Geçersiz davet kodu. Lütfen kontrol edip tekrar deneyin.");
    }

    setIsSearching(false);
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
        <h1 className="text-3xl font-bold mb-2">Kampanyaya Katıl</h1>
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
              placeholder="ABCD1234"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setError("");
              }}
              error={error}
              className="text-center font-mono text-lg tracking-widest uppercase"
            />

            <Button
              type="submit"
              className="w-full gap-2"
              isLoading={isSearching}
              disabled={!inviteCode || inviteCode.length < 4}
            >
              <Search className="h-4 w-4" />
              Kampanyayı Bul
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 rounded-lg bg-background-elevated text-center">
        <p className="text-sm text-foreground-secondary">
          Davet kodu, kampanya sahibi tarafından paylaşılır. Kampanya lobisinde
          davet kodunu bulabilirsin.
        </p>
      </div>

      {/* Demo Code Hint */}
      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 text-center">
        <p className="text-sm text-foreground-secondary">
          <strong className="text-primary">Demo için:</strong> MINE2024 kodunu
          kullanarak örnek kampanyaya katılabilirsin.
        </p>
      </div>
    </div>
  );
}


