"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ChatWindow, MessageInput, DiceRoller, CharacterMini, GameSetupWizard } from "@/components/game";
import { useGame, useGM, useDice } from "@/hooks/useGame";
import { get, post, put } from "@/lib/api/client";
import type { Message, DiceType, Character, Campaign } from "@/types";
import {
  Dice6,
  Backpack,
  Users,
  Settings,
  X,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidePanelView = "character" | "dice" | "inventory" | null;
type GamePhase = "loading" | "setup" | "playing";

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

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>("character");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [playerName, setPlayerName] = useState<string>("Oyuncu");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("loading");
  const [isNewSession, setIsNewSession] = useState(false);

  // Get campaign ID from URL params
  const campaignId = params.id as string;
  
  // Fetch active session automatically using centralized endpoint
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        setIsLoading(true);
        const response = await get(`/campaigns/${campaignId}/active-session`) as { 
          success: boolean; 
          session: any; 
          campaign: any; 
          error?: string;
          isNewSession?: boolean;
        };
        
        if (response && response.success) {
          const { session, campaign: campaignData } = response;
          
          // Set the actual session ID from the response
          if (session?.id) {
            setActiveSessionId(session.id);
          }

          // Check if this is a new session
          // Session yeni oluşturulmuşsa ve mesaj yoksa veya sadece 1 mesaj varsa setup göster
          const messageCount = session?.messages?.length || 0;
          const currentState = session?.currentState ? 
            (typeof session.currentState === 'string' ? JSON.parse(session.currentState) : session.currentState) 
            : {};
          
          // Eğer worldSettings yoksa ve çok az mesaj varsa setup göster
          const hasWorldSettings = currentState.worldSettings && Object.keys(currentState.worldSettings).length > 0;
          setIsNewSession(!hasWorldSettings && messageCount <= 1);
          
          // Set campaign data
          setCampaign({
            id: campaignData.id,
            name: campaignData.name || 'Kampanya',
            description: campaignData.description,
            creatorId: campaignData.creatorId || '',
            scenarioId: campaignData.scenarioId,
            isMultiplayer: campaignData.isMultiplayer || false,
            maxPlayers: campaignData.maxPlayers || 4,
            inviteCode: campaignData.inviteCode,
            status: (campaignData.status as Campaign['status']) || 'DRAFT',
            createdAt: campaignData.createdAt || new Date().toISOString(),
            updatedAt: campaignData.updatedAt || new Date().toISOString(),
          });

          // Get current user's player data and character
          const currentUserId = authSession?.user?.id;
          if (campaignData.players && campaignData.players.length > 0 && currentUserId) {
            // Find current user's player record
            const currentPlayer = campaignData.players.find(
              (p: any) => p.userId === currentUserId || p.user?.id === currentUserId
            );
            
            if (currentPlayer) {
              // Set player name (from user or character)
              if (currentPlayer.character) {
                setCharacter(currentPlayer.character);
                setPlayerName(currentPlayer.character.name);
              } else if (currentPlayer.user?.username) {
                setPlayerName(currentPlayer.user.username);
              }
            } else {
              // Fallback to auth session user name
              setPlayerName(authSession?.user?.name || 'Oyuncu');
            }
          } else if (authSession?.user?.name) {
            setPlayerName(authSession.user.name);
          }

          // Determine game phase
          if (!hasWorldSettings && messageCount <= 1) {
            setGamePhase("setup");
          } else {
            setGamePhase("playing");
          }
        } else {
          setError((response as any)?.error || 'Session alınamadı');
        }
      } catch (err) {
        console.error('Active session alınamadı:', err);
        setError('Sunucu hatası');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveSession();
  }, [campaignId]);

  // Use the actual session ID from the API response
  const sessionId = activeSessionId;

  // API hooks - only call when sessionId is available
  const {
    session,
    gameState,
    messages,
    isLoading: isGameLoading,
    error: gameError,
    sendMessage: apiSendMessage,
    addMessage,
    addMessages,
  } = useGame(sessionId || '');

  const {
    narrate,
    isLoading: isGMLoading,
    error: gmError,
  } = useGM(sessionId || '');

  const {
    rollDice,
    isLoading: isDiceLoading,
  } = useDice(sessionId || '');

  // Handle setup complete
  const handleSetupComplete = async (settings: WorldSettings) => {
    if (!sessionId) return;

    try {
      // Session'ı worldSettings ile güncelle
      await put(`/sessions/${sessionId}`, {
        currentState: {
          worldSettings: settings,
          location: settings.startingLocation.name,
          timeOfDay: 'morning',
          weather: 'clear',
          activeNPCs: [],
          activeQuests: [],
          notes: settings.setting,
        }
      });

      // Açılış anlatısını GM mesajı olarak ekle
      const openingMessage: Message = {
        id: `gm-opening-${Date.now()}`,
        sessionId: sessionId,
        senderType: 'GM',
        senderName: 'Game Master',
        content: settings.openingNarration,
        timestamp: new Date().toISOString(),
      };
      addMessage(openingMessage);

      // Oyuna geç
      setGamePhase("playing");
    } catch (err) {
      console.error('Setup kaydetme hatası:', err);
    }
  };

  // Handle skip setup
  const handleSkipSetup = () => {
    setGamePhase("playing");
  };

  // Handle pause campaign
  const handlePause = async () => {
    try {
      await post(`/campaigns/${campaignId}/pause`);
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      console.error('Pause hatası:', err);
      setError('Kampanya duraklatılamadı');
    }
  };


  if (isLoading || gamePhase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
          <span>Oyun yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Hata</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/campaigns">
          <Button variant="outline">Kampanyalara Dön</Button>
        </Link>
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

  if (campaign?.status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya Tamamlandı</h1>
        <p className="text-muted-foreground mb-4">Bu kampanya zaten tamamlanmış.</p>
        <Link href="/campaigns">
          <Button variant="outline">Kampanyalara Dön</Button>
        </Link>
      </div>
    );
  }

  // Setup Phase - Dünya Kurulumu
  if (gamePhase === "setup") {
    return (
      <div className="min-h-screen py-8 px-4">
        <GameSetupWizard
          campaignName={campaign.name}
          campaignDescription={campaign.description}
          onComplete={handleSetupComplete}
          onSkip={handleSkipSetup}
        />
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    // Önce oyuncu mesajını UI'a ekle (optimistic update)
    const playerMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId || '',
      senderType: 'PLAYER',
      senderName: character?.name || playerName,
      content: content,
      timestamp: new Date().toISOString(),
    };
    addMessage(playerMessage);

    // AI GM çağrısı yap
    const result = await narrate(content);
    
    if (result && result.narration) {
      // GM yanıtını mesajlara ekle
      const gmMessage: Message = {
        id: result.messageId || `gm-${Date.now()}`,
        sessionId: sessionId || '',
        senderType: 'GM',
        senderName: 'Game Master',
        content: result.narration,
        timestamp: result.timestamp || new Date().toISOString(),
      };
      addMessage(gmMessage);
    }
  };

  const handleDiceRoll = async (
    diceType: DiceType,
    count: number,
    modifier: number,
    results: number[]
  ) => {
    const result = await rollDice(diceType, count, modifier, 'Zar Atışı');
    
    if (result && result.message) {
      // Zar mesajını ekle
      addMessage(result.message);
    } else if (result) {
      // Eğer message yoksa manuel oluştur
      const total = result.total;
      const diceMessage: Message = {
        id: `dice-${Date.now()}`,
        sessionId: sessionId || '',
        senderType: 'SYSTEM',
        senderName: 'Sistem',
        content: `🎲 ${character?.name || playerName} ${count}${diceType}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''} attı: [${result.results.join(', ')}] = **${total}**`,
        timestamp: new Date().toISOString(),
      };
      addMessage(diceMessage);
    }
  };

  const toggleSidePanel = (view: SidePanelView) => {
    setSidePanelView(sidePanelView === view ? null : view);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Game Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePause}
          >
            <Pause className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{campaign?.name || 'Kampanya'}</h1>
            <p className="text-xs text-foreground-muted">
              {character?.name || playerName} olarak oynuyorsun
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              campaign?.status === 'ACTIVE' ? 'success' :
              campaign?.status === 'PAUSED' ? 'warning' : 'default'
            }
          >
            {campaign?.status === 'ACTIVE' ? 'Aktif' :
             campaign?.status === 'PAUSED' ? 'Duraklatıldı' :
             campaign?.status === 'DRAFT' ? 'Taslak' : campaign?.status}
          </Badge>
          <Link href={`/campaigns/${campaign?.id}/settings`}>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatWindow messages={messages} />

          {/* Error Message */}
          {(gameError || gmError) && (
            <div className="px-4 pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                <span>{gameError || gmError}</span>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isGMLoading && (
            <div className="px-4 pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                Game Master yazıyor...
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {(isGameLoading || isDiceLoading) && (
            <div className="px-4 pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
                <span>Yükleniyor...</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background">
            <MessageInput
              onSend={handleSendMessage}
              disabled={isGMLoading || isGameLoading}
              placeholder="Aksiyonunu yaz... (örn: 'Kapıyı açmaya çalışıyorum')"
            />

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("dice")}
                className={cn(
                  "gap-1",
                  sidePanelView === "dice" && "bg-primary/10 border-primary"
                )}
              >
                <Dice6 className="h-4 w-4" />
                Zar At
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("inventory")}
                className={cn(
                  "gap-1",
                  sidePanelView === "inventory" && "bg-primary/10 border-primary"
                )}
              >
                <Backpack className="h-4 w-4" />
                Envanter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("character")}
                className={cn(
                  "gap-1",
                  sidePanelView === "character" && "bg-primary/10 border-primary"
                )}
              >
                <Users className="h-4 w-4" />
                Karakter
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {sidePanelView && (
          <aside className="w-80 border-l border-border bg-background-secondary overflow-y-auto animate-slide-up">
            <div className="p-4">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {sidePanelView === "character" && "Karakter"}
                  {sidePanelView === "dice" && "Zar At"}
                  {sidePanelView === "inventory" && "Envanter"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidePanelView(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Panel Content */}
              {sidePanelView === "character" && character && (
                <CharacterMini character={character} />
              )}
              
              {!character && sidePanelView === "character" && (
                <div className="text-center text-muted-foreground py-8">
                  <p>Karakter bilgisi yükleniyor...</p>
                </div>
              )}

              {sidePanelView === "dice" && (
                <Card>
                  <CardContent className="p-4">
                    <DiceRoller onRoll={handleDiceRoll} />
                  </CardContent>
                </Card>
              )}

              {sidePanelView === "inventory" && character && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">Hızlı Erişim</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      {character.inventory && character.inventory.length > 0 ? (
                        character.inventory.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-background-elevated"
                          >
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-foreground-muted">
                                {item.type}
                              </p>
                            </div>
                            {item.equipped && (
                              <Badge variant="success" size="sm">
                                Kuşanılmış
                              </Badge>
                            )}
                            {item.quantity && (
                              <Badge variant="outline" size="sm">
                                x{item.quantity}
                              </Badge>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Envanter boş
                        </p>
                      )}
                    </div>
                    <Link href={`/characters/${character.id}/inventory`}>
                      <Button variant="ghost" size="sm" className="w-full mt-3">
                        Tam Envanteri Gör
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
