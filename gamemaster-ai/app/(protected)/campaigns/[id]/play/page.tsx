"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, ConfirmDialog } from "@/components/ui";
import { ChatWindow, MessageInput, DiceRoller, CharacterMini, GameSetupWizard, rollDiceForAction, ActionSuggestions, LocationImage, DiceModal, NPCModal } from "@/components/game";
import { InventoryModal } from "@/components/character";
import { useGame, useGM, useDice, useSuggestions, useLocationImage } from "@/hooks/useGame";
import { get, post, put } from "@/lib/api/client";
import type { Message, DiceType, Character, Campaign, GMAction, GMPrompt, LocationChange } from "@/types";
import {
  Dice6,
  Backpack,
  Users,
  Settings,
  X,
  Pause,
  RotateCcw,
  RefreshCw,
  Globe,
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
  const [pendingMandatoryAction, setPendingMandatoryAction] = useState<GMPrompt | null>(null);

  // Restart dialog states
  const [showFullResetDialog, setShowFullResetDialog] = useState(false);
  const [showRestartFromMessageDialog, setShowRestartFromMessageDialog] = useState(false);
  const [restartFromMessageId, setRestartFromMessageId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showNPCModal, setShowNPCModal] = useState(false);

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
          const scenarioHasWorldSettings = Boolean(campaignData?.scenario?.worldSettings);
          const scenarioIsPreset = Boolean(campaignData?.scenario?.isOfficial);
          const shouldSkipSetup = scenarioIsPreset || scenarioHasWorldSettings || hasWorldSettings;
          setIsNewSession(!shouldSkipSetup && messageCount <= 1);

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
          if (!shouldSkipSetup && messageCount <= 1) {
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
    fetchMessages,
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

  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    fetchSuggestions,
    clearSuggestions,
  } = useSuggestions(sessionId || '');

  const {
    locationImage,
    currentLocation,
    isLoading: isImageLoading,
    generateImage: generateLocationImage,
    clearImage: clearLocationImage,
  } = useLocationImage(sessionId || '');

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

      // Açılış mesajı için öneriler getir
      fetchSuggestions(settings.openingNarration);
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
          <Button variant="outline">Oturumlara Dön</Button>
        </Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Oturumlara Dön</Button>
        </Link>
      </div>
    );
  }

  // Kullanıcı kampanya creator mı? (erken tanımlama)
  const isCreator = campaign?.creatorId === authSession?.user?.id;

  if (campaign?.status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya Tamamlandı</h1>
        <p className="text-muted-foreground mb-4">Bu kampanya zaten tamamlanmış.</p>
        <Link href="/campaigns">
          <Button variant="outline">Oturumlara Dön</Button>
        </Link>
      </div>
    );
  }

  // Karakter seçimi zorunlu - karakter yoksa uyarı göster
  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          <Users className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
          <h1 className="text-2xl font-bold mb-4">Karakter Gerekli</h1>
          <p className="text-muted-foreground mb-6">
            Bu kampanyaya katılmak için önce bir karakter oluşturmanız gerekiyor.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`/campaigns/${campaignId}/characters/new`}>
              <Button className="w-full">Karakter Oluştur</Button>
            </Link>
            <Link href={`/campaigns/${campaignId}`}>
              <Button variant="outline" className="w-full">Kampanyaya Dön</Button>
            </Link>
          </div>
        </div>
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
    // Eğer zorunlu aksiyon bekleniyorsa, chat'ten mesaj gönderilmesini engelle
    if (pendingMandatoryAction?.isMandatory) {
      return;
    }

    // Önerileri temizle
    clearSuggestions();

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
      // GM yanıtını önce mesajlara ekle
      const gmMessage: Message = {
        id: result.messageId || `gm-${Date.now()}`,
        sessionId: sessionId || '',
        senderType: 'GM',
        senderName: 'Game Master',
        content: result.narration,
        timestamp: result.timestamp || new Date().toISOString(),
        gmPrompt: result.gmPrompt,
      };
      addMessage(gmMessage);

      // Lokasyon değişikliği varsa görsel üret ve mesajı güncelle
      if (result.locationChange?.changed && result.locationChange.newLocation && result.locationChange.description) {
        const imageResult = await generateLocationImage(
          result.locationChange.newLocation,
          result.locationChange.locationType || 'other',
          result.locationChange.description
        );

        if (imageResult?.success && imageResult.imageUrl) {
          // Mesajı veritabanında güncelle
          await put(`/messages/${gmMessage.id}`, {
            locationImageUrl: imageResult.imageUrl,
            locationName: result.locationChange.newLocation,
          });

          // Mesajları yeniden yükle
          await fetchMessages();
        }
      }

      // Eğer zorunlu aksiyon varsa, state'i güncelle
      if (result.gmPrompt?.isMandatory) {
        setPendingMandatoryAction(result.gmPrompt);
      } else {
        setPendingMandatoryAction(null);
        // Zorunlu aksiyon yoksa önerileri getir
        fetchSuggestions(result.narration);
      }
    }
  };

  // Aksiyon seçimi handler'ı
  const handleActionSelect = async (action: GMAction, messageId: string) => {
    // Önerileri temizle
    clearSuggestions();

    // Seçilen aksiyonu oyuncu mesajı olarak ekle
    const playerMessage: Message = {
      id: `action-${Date.now()}`,
      sessionId: sessionId || '',
      senderType: 'PLAYER',
      senderName: character?.name || playerName,
      content: `[${action.label}] ${action.description || action.value || ''}`.trim(),
      timestamp: new Date().toISOString(),
    };
    addMessage(playerMessage);

    // Zorunlu aksiyon state'ini temizle
    setPendingMandatoryAction(null);

    // AI'ya seçimi gönder
    const result = await narrate(`${action.label}: ${action.value || action.description || ''}`);

    if (result && result.narration) {
      const gmMessage: Message = {
        id: result.messageId || `gm-${Date.now()}`,
        sessionId: sessionId || '',
        senderType: 'GM',
        senderName: 'Game Master',
        content: result.narration,
        timestamp: result.timestamp || new Date().toISOString(),
        gmPrompt: result.gmPrompt,
      };
      addMessage(gmMessage);

      // Lokasyon değişikliği varsa görsel üret ve mesajı güncelle
      if (result.locationChange?.changed && result.locationChange.newLocation && result.locationChange.description) {
        const imageResult = await generateLocationImage(
          result.locationChange.newLocation,
          result.locationChange.locationType || 'other',
          result.locationChange.description
        );

        if (imageResult?.success && imageResult.imageUrl) {
          await put(`/messages/${gmMessage.id}`, {
            locationImageUrl: imageResult.imageUrl,
            locationName: result.locationChange.newLocation,
          });
          await fetchMessages();
        }
      }

      if (result.gmPrompt?.isMandatory) {
        setPendingMandatoryAction(result.gmPrompt);
      } else {
        // Zorunlu aksiyon yoksa önerileri getir
        fetchSuggestions(result.narration);
      }
    }
  };

  // Zar atışı handler'ı (ActionButtons'dan)
  const handleActionDiceRoll = async (action: GMAction, messageId: string) => {
    // Zarı at
    const rollResult = rollDiceForAction(action);
    // Gorsel basarili uretildiyse, sohbete GM mesaji olarak ekle
    const skillText = action.skill ? ` ${action.skill}` : '';
    const dcText = action.dc ? ` (DC ${action.dc})` : '';
    const successText = rollResult.success !== undefined
      ? (rollResult.success ? ' ✅ Başarılı!' : ' ❌ Başarısız')
      : '';

    const diceMessage: Message = {
      id: `dice-action-${Date.now()}`,
      sessionId: sessionId || '',
      senderType: 'DICE',
      senderName: 'Zar Atışı',
      content: `🎲 ${character?.name || playerName}${skillText}${dcText} atışı: [${rollResult.results.join(', ')}]${rollResult.modifier !== 0 ? ` + ${rollResult.modifier}` : ''} = ${rollResult.total}${successText}`,
      timestamp: new Date().toISOString(),
    };
    addMessage(diceMessage);

    // Zorunlu aksiyon state'ini temizle
    setPendingMandatoryAction(null);

    // AI'ya zar sonucunu bildir
    const actionText = `${action.skill || 'Zar'} kontrolü attım. Sonuç: ${rollResult.total}${rollResult.success !== undefined ? (rollResult.success ? ' (Başarılı)' : ' (Başarısız)') : ''}`;
    const result = await narrate(actionText);

    if (result && result.narration) {
      const gmMessage: Message = {
        id: result.messageId || `gm-${Date.now()}`,
        sessionId: sessionId || '',
        senderType: 'GM',
        senderName: 'Game Master',
        content: result.narration,
        timestamp: result.timestamp || new Date().toISOString(),
        gmPrompt: result.gmPrompt,
      };
      addMessage(gmMessage);

      // Lokasyon değişikliği varsa görsel üret ve mesajı güncelle
      if (result.locationChange?.changed && result.locationChange.newLocation && result.locationChange.description) {
        const imageResult = await generateLocationImage(
          result.locationChange.newLocation,
          result.locationChange.locationType || 'other',
          result.locationChange.description
        );

        if (imageResult?.success && imageResult.imageUrl) {
          await put(`/messages/${gmMessage.id}`, {
            locationImageUrl: imageResult.imageUrl,
            locationName: result.locationChange.newLocation,
          });
          await fetchMessages();
        }
      }

      if (result.gmPrompt?.isMandatory) {
        setPendingMandatoryAction(result.gmPrompt);
      }
    }
  };

  const handleDiceRoll = async (
    diceType: DiceType,
    count: number,
    modifier: number,
    results: number[]
  ) => {
    // DiceRoller'dan gelen sonuçları kullan (tekrar atma!)
    const total = results.reduce((a, b) => a + b, 0) + modifier;

    const diceMessage: Message = {
      id: `dice-${Date.now()}`,
      sessionId: sessionId || '',
      senderType: 'DICE',
      senderName: 'Zar Atışı',
      content: `🎲 ${character?.name || playerName} ${count}${diceType}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''} attı: [${results.join(', ')}] = ${total}`,
      timestamp: new Date().toISOString(),
    };
    addMessage(diceMessage);
  };

  // Sahne görseli üretme handler'ı
  const handleGenerateSceneImage = async () => {
    if (!sessionId) return;

    // Son GM mesajından sahne bilgisini al
    const lastGMMessages = messages
      .filter(m => m.senderType === 'GM')
      .slice(-2);

    if (lastGMMessages.length === 0) return;

    // Son mesajlardan sahne açıklaması oluştur
    const sceneContext = lastGMMessages.map(m => m.content).join(' ');

    // Mevcut lokasyon bilgisini al
    const locationName = currentLocation || 'Bilinmeyen Mekan';

    // Sahne açıklamasını İngilizce'ye çevirmeden direkt kullan
    // API bunu handle edecek
    const sceneDescription = `Current scene: ${sceneContext.substring(0, 500)}`;

    // Görseli üret
    const imageResult = await generateLocationImage(
      locationName,
      'other',
      sceneDescription,
      {
        createMessage: true,
        messageContent: `Scene image: ${locationName}`,
        excludeFromContext: true,
      }
    );

    // Gorsel basarili uretildiyse, sohbete GM mesaji olarak ekle
    if (imageResult?.success && imageResult.imageUrl) {
      if (imageResult.message) {
        addMessage(imageResult.message);
      } else {
        await fetchMessages();
      }
    }
  };

  const toggleSidePanel = (view: SidePanelView) => {
    setSidePanelView(sidePanelView === view ? null : view);
  };

  // Belirli mesajdan itibaren yeniden başlatma handler'ı
  const handleRestartFromMessage = async () => {
    if (!sessionId || !restartFromMessageId) return;

    setIsResetting(true);
    try {
      const response = await post(`/sessions/${sessionId}/reset`, {
        type: 'from_message',
        messageId: restartFromMessageId,
      }) as { success: boolean; newMessage?: Message; deletedCount?: number };

      if (response.success) {
        // Mesajları yeniden yükle
        fetchMessages();
        setPendingMandatoryAction(null);
      }
    } catch (err) {
      console.error('Restart from message error:', err);
      setError('Oyun yeniden başlatılamadı');
    } finally {
      setIsResetting(false);
      setShowRestartFromMessageDialog(false);
      setRestartFromMessageId(null);
    }
  };

  // ChatWindow'dan gelen restart isteği
  const handleRestartFromMessageRequest = (messageId: string) => {
    setRestartFromMessageId(messageId);
    setShowRestartFromMessageDialog(true);
  };

  // GM mesajını yeniden üret
  const handleRegenerateMessage = async (messageId: string) => {
    if (!sessionId) return;

    try {
      // Mesajı bul
      const targetMessage = messages.find(m => m.id === messageId);
      if (!targetMessage || targetMessage.senderType !== 'GM') {
        setError('Sadece GM mesajları yeniden üretilebilir');
        return;
      }

      // Önceki oyuncu mesajını bul
      const targetIndex = messages.findIndex(m => m.id === messageId);
      let previousPlayerMessage: Message | undefined;

      for (let i = targetIndex - 1; i >= 0; i--) {
        if (messages[i].senderType === 'PLAYER' || messages[i].senderType === 'DICE') {
          previousPlayerMessage = messages[i];
          break;
        }
      }

      if (!previousPlayerMessage) {
        setError('Bu mesaj için önceki oyuncu aksiyonu bulunamadı');
        return;
      }

      // Bu mesaj ve sonrasını sil
      await post(`/sessions/${sessionId}/reset`, {
        type: 'from_message',
        messageId: previousPlayerMessage.id, // Önceki mesajdan sonrasını sil
      });

      // Mesajları yeniden yükle
      await fetchMessages();

      // Yeni GM yanıtı üret (narrate fonksiyonu kendi loading state'ini yönetir)
      const result = await narrate(previousPlayerMessage.content, { skipPlayerMessageSave: true });

      if (result && result.narration) {
        const gmMessage: Message = {
          id: result.messageId || `gm-${Date.now()}`,
          sessionId: sessionId || '',
          senderType: 'GM',
          senderName: 'Game Master',
          content: result.narration,
          timestamp: result.timestamp || new Date().toISOString(),
          gmPrompt: result.gmPrompt,
        };
        addMessage(gmMessage);

        // Lokasyon değişikliği varsa görsel üret ve mesajı güncelle
        if (result.locationChange?.changed && result.locationChange.newLocation && result.locationChange.description) {
          const imageResult = await generateLocationImage(
            result.locationChange.newLocation,
            result.locationChange.locationType || 'other',
            result.locationChange.description
          );

          if (imageResult?.success && imageResult.imageUrl) {
            await put(`/messages/${gmMessage.id}`, {
              locationImageUrl: imageResult.imageUrl,
              locationName: result.locationChange.newLocation,
            });
            await fetchMessages();
          }
        }

        if (result.gmPrompt?.isMandatory) {
          setPendingMandatoryAction(result.gmPrompt);
        } else {
          setPendingMandatoryAction(null);
          fetchSuggestions(result.narration);
        }
      }
    } catch (err) {
      console.error('Regenerate message error:', err);
      setError('Mesaj yeniden üretilemedi');
    }
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

          {/* Reset Button - Sadece creator görebilir */}
          {isCreator && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullResetDialog(true)}
              title="Oyunu Sıfırla"
              className="text-warning hover:text-warning hover:bg-warning/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

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
          {/* Location Image - Mekan değiştiğinde göster */}

          <div className="relative flex-1 flex flex-col min-h-0">
            <ChatWindow
              messages={messages}
              onActionSelect={handleActionSelect}
              onDiceRoll={handleActionDiceRoll}
              onRestartFromMessage={handleRestartFromMessageRequest}
              onRegenerateMessage={handleRegenerateMessage}
              isActionLoading={isGMLoading}
              disableActions={isGMLoading}
              canRestart={isCreator}
            />

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

            {/* AI Action Suggestions - Sadece GM prompt yoksa göster */}
            {!pendingMandatoryAction?.isMandatory && !messages.some(m => m.senderType === 'GM' && m.gmPrompt && m.gmPrompt.actions && m.gmPrompt.actions.length > 0) && (
              <ActionSuggestions
                suggestions={suggestions}
                isLoading={isSuggestionsLoading}
                onSelect={(detailedAction) => handleSendMessage(detailedAction)}
                disabled={isGMLoading}
              />
            )}

            {(locationImage || isImageLoading) && (
              <div className="absolute inset-0 z-20 px-4 pt-4 pb-4">
                <LocationImage
                  imageUrl={locationImage}
                  locationName={currentLocation}
                  isLoading={isImageLoading}
                  onClose={clearLocationImage}
                  fillHeight
                />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background">
            {/* Zorunlu Aksiyon Uyarısı */}
            {pendingMandatoryAction?.isMandatory && (
              <div className="mb-3 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm flex items-center gap-2">
                <span className="font-medium">⚠️ Zorunlu Aksiyon:</span>
                <span>{pendingMandatoryAction.promptText || 'Yukarıdaki seçeneklerden birini seç'}</span>
              </div>
            )}

            <MessageInput
              onSend={handleSendMessage}
              onGenerateImage={handleGenerateSceneImage}
              isGeneratingImage={isImageLoading}
              disabled={isGMLoading || isGameLoading || !!pendingMandatoryAction?.isMandatory}
              placeholder={
                pendingMandatoryAction?.isMandatory
                  ? "Önce yukarıdaki aksiyonu tamamla..."
                  : "Aksiyonunu yaz... (örn: 'Kapıyı açmaya çalışıyorum')"
              }
            />

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiceModal(true)}
                className="gap-1"
              >
                <Dice6 className="h-4 w-4" />
                Zar At
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInventoryModal(true)}
                className="gap-1"
              >
                <Backpack className="h-4 w-4" />
                Envanter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNPCModal(true)}
                className="gap-1"
              >
                <Users className="h-4 w-4" />
                Karakterler
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
                🧙 Karakter
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
            </div>
          </aside>
        )}
      </div>

      {/* Full Reset Options Dialog */}
      {showFullResetDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-[calc(100%-2rem)] p-6 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Oyunu Sıfırla</h3>
              <p className="text-foreground-secondary text-sm">
                Nasıl sıfırlamak istiyorsun?
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Full reset with world redesign */}
              <button
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await post(`/sessions/${sessionId}/reset`, {
                      type: 'full',
                      keepWorldSettings: false,
                    });
                    // Setup fazına geri dön
                    setGamePhase("setup");
                    fetchMessages();
                    setPendingMandatoryAction(null);
                  } catch (err) {
                    console.error('Reset error:', err);
                    setError('Oyun sıfırlanamadı');
                  } finally {
                    setIsResetting(false);
                    setShowFullResetDialog(false);
                  }
                }}
                disabled={isResetting}
                className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Tamamen Yeniden Başla</p>
                    <p className="text-sm text-foreground-secondary mt-1">
                      Dünya ve harita ayarlarını yeniden tasarla, her şeyi sıfırla
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Keep world, reset messages */}
              <button
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await post(`/sessions/${sessionId}/reset`, {
                      type: 'full',
                      keepWorldSettings: true,
                    });
                    fetchMessages();
                    setPendingMandatoryAction(null);
                  } catch (err) {
                    console.error('Reset error:', err);
                    setError('Oyun sıfırlanamadı');
                  } finally {
                    setIsResetting(false);
                    setShowFullResetDialog(false);
                  }
                }}
                disabled={isResetting}
                className="w-full p-4 rounded-lg border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20">
                    <RotateCcw className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">Sadece Mesajları Sıfırla</p>
                    <p className="text-sm text-foreground-secondary mt-1">
                      Dünya ayarları kalır, ilk GM mesajından başla
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowFullResetDialog(false)}
              disabled={isResetting}
              className="w-full mt-4 py-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              İptal
            </button>

            {isResetting && (
              <div className="absolute inset-0 bg-card/80 rounded-xl flex items-center justify-center">
                <div className="flex items-center gap-2 text-primary">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Sıfırlanıyor...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restart From Message Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRestartFromMessageDialog}
        onClose={() => {
          setShowRestartFromMessageDialog(false);
          setRestartFromMessageId(null);
        }}
        onConfirm={handleRestartFromMessage}
        title="Bu Noktadan Yeniden Başlat"
        description="Bu mesajdan sonraki tüm mesajlar silinecek ve oyun bu noktadan devam edecek. Bu işlem geri alınamaz!"
        confirmText="Yeniden Başlat"
        cancelText="İptal"
        variant="warning"
        isLoading={isResetting}
      />

      {/* Dice Modal */}
      <DiceModal
        isOpen={showDiceModal}
        onClose={() => setShowDiceModal(false)}
        onRoll={handleDiceRoll}
      />

      {/* Inventory Modal */}
      {character && (
        <InventoryModal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          characterId={character.id}
        />
      )}

      {/* NPC Modal */}
      {sessionId && (
        <NPCModal
          isOpen={showNPCModal}
          onClose={() => setShowNPCModal(false)}
          sessionId={sessionId}
          onTalkToNPC={(npc) => {
            // Send message to talk to NPC
            handleSendMessage(`${npc.name} ile konuşmak istiyorum`);
          }}
        />
      )}
    </div>
  );
}
