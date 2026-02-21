"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { CampaignCard } from "@/components/campaign";
import { Plus, Swords, Search, Users, Loader2 } from "lucide-react";
import { get } from "@/lib/api/client";
import { useSession } from "next-auth/react";
import type { Campaign } from "@/types";

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch campaigns from API
  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      try {
        const response = await get('/campaigns') as { success: boolean; campaigns: Campaign[] };
        if (response && response.success && Array.isArray(response.campaigns)) {
          setCampaigns(response.campaigns);
        }
      } catch (error) {
        console.error('Campaigns alınamadı:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Filter campaigns
  const userId = session?.user?.id;
  const myCampaigns = campaigns.filter((c) => c.creatorId === userId);
  const joinedCampaigns = campaigns.filter(
    (c) => c.creatorId !== userId && c.status === "ACTIVE"
  );

  const filterCampaigns = (campaigns: Campaign[]) =>
    campaigns.filter((c) => {
      const query = searchQuery.toLowerCase();
      const description = c.description ? c.description.toLowerCase() : "";
      return (
        c.name.toLowerCase().includes(query) ||
        description.includes(query)
      );
    });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Oturumlar</h1>
          <p className="text-foreground-secondary">
            {campaigns.length} oturum
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
              Yeni Oturum
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Oturum ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">
            Oturumlarım
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
          ) : filterCampaigns(myCampaigns).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filterCampaigns(myCampaigns).map((campaign: any) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : myCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Swords className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Henüz oturum yok
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  Kendi maceranı oluştur veya bir senaryo seçerek epik bir yolculuğa başla.
                </p>
                <Link href="/campaigns/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    İlk Oturumunu Oluştur
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
          ) : filterCampaigns(joinedCampaigns).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filterCampaigns(joinedCampaigns).map((campaign: any) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : joinedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-16 w-16 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Henüz bir oturuma katılmadın
                </h3>
                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                  Arkadaşlarının oturumlarına davet koduyla katılabilirsin.
                </p>
                <Link href="/campaigns/join">
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Davet Koduyla Katıl
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
      </Tabs>
    </div>
  );
}
