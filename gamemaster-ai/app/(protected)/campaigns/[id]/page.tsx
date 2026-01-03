"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Avatar } from "@/components/ui";
import {
  ArrowLeft,
  Play,
  Settings,
  Copy,
  Users,
  Check,
  Swords,
  Map,
  Clock,
  UserPlus,
  Loader2,
  Crown,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { get, post, del } from "@/lib/api/client";
import { useSession } from "next-auth/react";

export default function CampaignLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [scenario, setScenario] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [myPlayer, setMyPlayer] = useState<any>(null);

  const currentUserId = session?.user?.id;
  const isCreator = campaign?.creatorId === currentUserId;

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!params.id) return;

      setIsLoading(true);
      try {
        const response = await get(`/campaigns/${params.id}`) as { success: boolean; campaign: any };
        if (response && response.success && response.campaign) {
          setCampaign(response.campaign);
          
          // Set scenario if exists
          if (response.campaign.scenario) {
            setScenario(response.campaign.scenario);
          }
          
          // Set players
          if (response.campaign.players) {
            setPlayers(response.campaign.players);
            
            // Kullanıcının player kaydını bul
            const myPlayerRecord = response.campaign.players.find(
              (p: any) => p.userId === currentUserId
            );
            setMyPlayer(myPlayerRecord || null);
            
            if (myPlayerRecord?.characterId) {
              setSelectedCharacterId(myPlayerRecord.characterId);
            }
          }
          
          // Get user's available characters
          const charsResponse = await get('/characters') as { success: boolean; characters: any[] };
          if (charsResponse && charsResponse.success && charsResponse.characters) {
            // Başka kampanyada olmayan veya bu kampanyada olan karakterler
            const available = charsResponse.characters.filter(
              (c: any) => !c.campaignId || c.campaignId === response.campaign.id
            );
            setAvailableCharacters(available);
          }
        }
      } catch (error) {
        console.error('Campaign alınamadı:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignData();
  }, [params.id, currentUserId]);

  // Fetch active session for this campaign
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!campaign) return;
      
      setIsLoadingSession(true);
      try {
        const sessions = await get(`/campaigns/${campaign.id}/sessions`);
        if (Array.isArray(sessions) && sessions.length > 0) {
          setActiveSessionId(sessions[0].id);
        }
      } catch (error) {
        console.error('Session alınamadı:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    fetchActiveSession();
  }, [campaign]);

  // Karakter seçimi ile lobiye katıl
  const handleJoinWithCharacter = async (characterId: string) => {
    if (!campaign) return;
    
    setIsJoining(true);
    try {
      const response = await post<{ success: boolean; message?: string }>(
        `/campaigns/${campaign.id}/join`,
        { characterId }
      );
      if (response && response.success) {
        setSelectedCharacterId(characterId);
        // Sayfayı yenile
        window.location.reload();
      }
    } catch (error) {
      console.error('Lobiye katılma hatası:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Lobiden ayrıl
  const handleLeaveLobby = async () => {
    if (!campaign) return;
    
    setIsLeaving(true);
    try {
      const response = await del<{ success: boolean; message?: string }>(
        `/campaigns/${campaign.id}/join`
      );
      if (response && response.success) {
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Lobiden ayrılma hatası:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Kampanyalara Dön</Button>
        </Link>
      </div>
    );
  }

  const handleCopyCode = () => {
    if (campaign.inviteCode) {
      navigator.clipboard.writeText(campaign.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const statusColors: Record<string, "default" | "success" | "warning" | "secondary" | "outline" | "primary" | "danger"> = {
    DRAFT: "default",
    ACTIVE: "success",
    PAUSED: "warning",
    COMPLETED: "secondary",
  };

  // Creator'ı ve players'ı birleştir
  const getAllParticipants = () => {
    const participants: any[] = [];
    
    // Creator'ı ekle (players listesinde değilse)
    const creatorInPlayers = players.find((p: any) => p.userId === campaign.creatorId);
    
    if (!creatorInPlayers && campaign.creator) {
      participants.push({
        id: 'creator',
        userId: campaign.creatorId,
        user: campaign.creator,
        character: null,
        isActive: true,
        isCreator: true,
      });
    }
    
    // Players'ı ekle
    players.forEach((player: any) => {
      participants.push({
        ...player,
        isCreator: player.userId === campaign.creatorId,
      });
    });
    
    return participants;
  };

  const allParticipants = getAllParticipants();
  const hasJoined = myPlayer !== null || isCreator;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/campaigns">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kampanyalara Dön
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge variant={statusColors[campaign.status]}>{campaign.status}</Badge>
          </div>
          {campaign.description && (
            <p className="text-foreground-secondary max-w-2xl">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {isCreator && (
            <Link href={`/campaigns/${campaign.id}/settings`}>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Ayarlar
              </Button>
            </Link>
          )}
          <div className="flex gap-2">
            {/* Play/Resume Button - sadece karakter seçilmişse */}
            {(campaign.status === "ACTIVE" || campaign.status === "PAUSED") && hasJoined && (
              <Link href={`/campaigns/${campaign.id}/play`}>
                <Button className="gap-2" disabled={isLoadingSession}>
                  {isLoadingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {campaign.status === "PAUSED" ? "Oyuna Devam Et" : "Oyuna Başla"}
                </Button>
              </Link>
            )}

            {/* Draft durumunda oyuna başla - sadece creator */}
            {campaign.status === "DRAFT" && isCreator && (
              <Button
                className="gap-2"
                onClick={async () => {
                  try {
                    // Kampanya durumunu ACTIVE yap
                    await post(`/campaigns/${campaign.id}/pause`); // Bu endpoint ACTIVE'e de çevirebilir
                    window.location.reload();
                  } catch (err) {
                    console.error('Başlatma hatası:', err);
                  }
                }}
              >
                <Play className="h-4 w-4" />
                Kampanyayı Başlat
              </Button>
            )}

            {/* Pause Button */}
            {campaign.status === "ACTIVE" && isCreator && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  try {
                    await post(`/campaigns/${campaign.id}/pause`);
                    window.location.reload();
                  } catch (err) {
                    console.error('Pause hatası:', err);
                  }
                }}
              >
                <Clock className="h-4 w-4" />
                Duraklat
              </Button>
            )}

            {/* Lobiden Ayrıl - creator değilse */}
            {hasJoined && !isCreator && (
              <Button
                variant="outline"
                className="gap-2 text-danger hover:bg-danger/10"
                onClick={handleLeaveLobby}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Lobiden Ayrıl
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Info */}
          {scenario && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Senaryo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                    <Swords className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{scenario.title}</h3>
                      {scenario.isOfficial && (
                        <Badge variant="primary" size="sm">
                          Resmi
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground-secondary mb-3">
                      {scenario.description}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{scenario.genre}</Badge>
                      <Badge variant="outline">{scenario.difficulty}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Oyuncular ({allParticipants.length}/{campaign.maxPlayers})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allParticipants.map((player: any) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      player.userId === currentUserId
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-background-elevated'
                    }`}
                  >
                    <Avatar
                      src={player.user?.avatar}
                      fallback={player.user?.username}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          {player.user?.username}
                          {player.userId === currentUserId && (
                            <span className="text-primary ml-1">(Sen)</span>
                          )}
                        </h4>
                        {player.isCreator && (
                          <Badge variant="warning" size="sm" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Kurucu
                          </Badge>
                        )}
                      </div>
                      {player.character ? (
                        <p className="text-sm text-foreground-secondary">
                          {player.character.name} - Lv.{player.character.level}{" "}
                          {player.character.race} {player.character.class}
                        </p>
                      ) : (
                        <p className="text-sm text-foreground-muted italic">
                          Karakter seçmedi
                        </p>
                      )}
                    </div>
                    <Badge variant={player.isActive ? "success" : "default"}>
                      {player.isActive ? "Hazır" : "Bekliyor"}
                    </Badge>
                  </div>
                ))}

                {allParticipants.length < campaign.maxPlayers && (
                  <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border text-foreground-muted">
                    <UserPlus className="h-5 w-5" />
                    <span>Oyuncu bekleniyor...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invite Code - her zaman göster */}
          {campaign.inviteCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Davet Kodu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-lg bg-background-elevated font-mono text-lg text-center">
                    {campaign.inviteCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {codeCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-foreground-muted mt-2 text-center">
                  Bu kodu arkadaşlarınla paylaşarak onları kampanyaya davet
                  edebilirsin.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Mod</span>
                <Badge variant="outline">
                  {campaign.isMultiplayer ? "Çok Oyunculu" : "Solo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Kurucu</span>
                <span>{campaign.creator?.username}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Oluşturulma</span>
                <span>{formatDate(campaign.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Son Güncelleme</span>
                <span>{formatDate(campaign.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Character Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Karakterini Seç
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableCharacters.length > 0 ? (
                <div className="space-y-2">
                  {availableCharacters.map((char: any) => {
                    const isSelected = selectedCharacterId === char.id;
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleJoinWithCharacter(char.id)}
                        disabled={isJoining || isSelected}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-background-elevated'
                        } ${isJoining ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Avatar fallback={char.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{char.name}</p>
                          <p className="text-xs text-foreground-muted">
                            Lv.{char.level} {char.race} {char.class}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge variant="success" size="sm">
                            <Check className="h-3 w-3 mr-1" />
                            Seçili
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground-secondary mb-3">
                    Kullanılabilir karakterin yok
                  </p>
                  <Link href="/characters/new">
                    <Button size="sm" variant="outline">
                      Karakter Oluştur
                    </Button>
                  </Link>
                </div>
              )}
              
              {isJoining && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-foreground-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lobiye katılınıyor...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
