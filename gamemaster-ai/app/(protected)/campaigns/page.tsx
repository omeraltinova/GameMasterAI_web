"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { CampaignCard } from "@/components/campaign";
import { mockCampaigns } from "@/lib/mock-data";
import { Plus, Swords, Search, Users } from "lucide-react";

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter campaigns (mock: all for display)
  const myCampaigns = mockCampaigns.filter((c) => c.creatorId === "user_1");
  const joinedCampaigns = mockCampaigns.filter(
    (c) => c.creatorId !== "user_1" && c.status === "ACTIVE"
  );

  const filterCampaigns = (campaigns: typeof mockCampaigns) =>
    campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kampanyalar</h1>
          <p className="text-foreground-secondary">
            {mockCampaigns.length} kampanya
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns/join">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Katıl
            </Button>
          </Link>
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Kampanya
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Kampanya ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">
            Kampanyalarım
            <Badge variant="primary" size="sm" className="ml-2">
              {myCampaigns.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="joined">
            Katıldıklarım
            <Badge variant="secondary" size="sm" className="ml-2">
              {joinedCampaigns.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* My Campaigns */}
        <TabsContent value="my">
          {filterCampaigns(myCampaigns).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCampaigns(myCampaigns).map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : myCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Swords className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Henüz kampanyan yok
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  Kendi maceranı oluştur veya bir senaryo seçerek epik bir yolculuğa başla.
                </p>
                <Link href="/campaigns/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    İlk Kampanyani Oluştur
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-foreground-muted mx-auto mb-4" />
                <p className="text-foreground-secondary">Sonuç bulunamadı</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Joined Campaigns */}
        <TabsContent value="joined">
          {filterCampaigns(joinedCampaigns).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCampaigns(joinedCampaigns).map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Henüz bir kampanyaya katılmadın
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  Arkadaşlarının kampanyalarına davet koduyla katılabilirsin.
                </p>
                <Link href="/campaigns/join">
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Davet Koduyla Katıl
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


