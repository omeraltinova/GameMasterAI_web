"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, ConfirmDialog } from "@/components/ui";
import { ChatWindow, MessageInput, CharacterModal, GameSetupWizard, ActionSuggestions, LocationImage, DiceModal, NPCModal, CombatTracker, TargetSelector, DiceHistory } from "@/components/game";
import { InventoryModal } from "@/components/character";
import { MapModal } from "@/components/map";
import { useGame, useGM, useDice, useSuggestions, useLocationImage, useMaps } from "@/hooks/useGame";
import { APIError, get, post, put } from "@/lib/api/client";
import type { Message, DiceType, Character, Campaign, GMAction, GMPrompt, LocationChange, Combat } from "@/types";
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
  Map,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// Structured outcome of a mechanical combat action (mirrors the action route's
// `resolution`). Used to feed the narration layer the real numbers.
type CombatResolution = {
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  action?: string;
  isAttack?: boolean;
  hit?: boolean;
  crit?: boolean;
  attackRoll?: number | null;
  damage?: number;
  targetHpRemaining?: number | null;
  targetMaxHp?: number | null;
  targetDefeated?: boolean;
  combatEnded?: boolean;
};

function parseCombatValue(combatData: unknown): Combat | null {
  if (!combatData || typeof combatData !== "object") return null;

  const payload = combatData as Record<string, unknown>;

  const parseParticipants = (value: unknown) => {
    const parseArray = (arr: unknown[]): Combat["participants"] => {
      return arr
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const participant = entry as Record<string, unknown>;
          if (typeof participant.id !== "string" || typeof participant.name !== "string") {
            return null;
          }

          const typeValue = participant.type;
          const type =
            typeValue === "player" || typeValue === "enemy" || typeValue === "ally"
              ? typeValue
              : "enemy";

          const hp = Number(participant.hp ?? 0);
          const maxHp = Number(participant.maxHp ?? 1);
          const initiative = Number(participant.initiative ?? 0);
          const ac = Number(participant.ac ?? 10);

          return {
            id: participant.id,
            type,
            name: participant.name,
            initiative: Number.isFinite(initiative) ? Math.round(initiative) : 0,
            hp: Number.isFinite(hp) ? Math.max(0, Math.round(hp)) : 0,
            maxHp: Number.isFinite(maxHp) ? Math.max(1, Math.round(maxHp)) : 1,
            ac: Number.isFinite(ac) ? Math.max(1, Math.round(ac)) : 10,
          };
        })
        .filter((entry): entry is Combat["participants"][number] => entry !== null);
    };

    if (Array.isArray(value)) {
      return parseArray(value);
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parseArray(parsed) : [];
      } catch {
        return [];
      }
    }

    return [];
  };

  const parseLog = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? parsed.filter((entry): entry is string => typeof entry === "string")
          : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const participants = parseParticipants(payload.participants);
  const turnOrder = parseParticipants(payload.turnOrder);
  const status = payload.status === "ended" ? "ended" : "active";

  if (typeof payload.id !== "string" || typeof payload.sessionId !== "string") {
    return null;
  }

  return {
    id: payload.id,
    sessionId: payload.sessionId,
    participants,
    turnOrder: turnOrder.length > 0 ? turnOrder : participants,
    currentTurn: Number.isFinite(Number(payload.currentTurn))
      ? Math.max(0, Math.round(Number(payload.currentTurn)))
      : 0,
    round: Number.isFinite(Number(payload.round))
      ? Math.max(1, Math.round(Number(payload.round)))
      : 1,
    status,
    log: parseLog(payload.log),
    createdAt:
      typeof payload.createdAt === "string"
        ? payload.createdAt
        : new Date().toISOString(),
  };
}

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [playerName, setPlayerName] = useState<string>("Oyuncu");
  const [allPlayers, setAllPlayers] = useState<Array<{ userId: string; username: string; character: Character | null; isCreator: boolean }>>([]);
  const [sidePanelMode, setSidePanelMode] = useState<"characters" | "dice" | null>(null);
  const [selectedCharacterForModal, setSelectedCharacterForModal] = useState<Character | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [worldSettings, setWorldSettings] = useState<WorldSettings | null>(null);
  const [activeCombat, setActiveCombat] = useState<Combat | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isCombatLoading, setIsCombatLoading] = useState(false);
  const [diceHistoryRefreshSignal, setDiceHistoryRefreshSignal] = useState(0);

  // Get campaign ID from URL params
  const campaignId = params.id as string;

  // Fetch active session automatically using centralized endpoint
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        setIsLoading(true);
        const response = await post(`/campaigns/${campaignId}/active-session`, {}) as {
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

          // World settings'i kaydet
          if (hasWorldSettings) {
            setWorldSettings(currentState.worldSettings);
          } else if (scenarioHasWorldSettings) {
            setWorldSettings(campaignData.scenario.worldSettings);
          }

          // Set campaign data
          setCampaign({
            id: campaignData.id,
            name: campaignData.name || 'Oturum',
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
            // Tüm oyuncuları kaydet
            const playersList = campaignData.players.map((p: any) => ({
              userId: p.userId || p.user?.id || '',
              username: p.user?.username || 'Oyuncu',
              character: p.character || null,
              isCreator: p.userId === campaignData.creatorId,
            }));
            setAllPlayers(playersList);

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
    removeMessage,
    fetchMessages,
    fetchGameState,
    fetchUpdates,
  } = useGame(sessionId || '');

  const {
    narrate,
    npcDialogue,
    describeLocation,
    combatAction,
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
    loadSuggestionsFromMessages,
    clearSuggestions,
  } = useSuggestions(sessionId || '');

  const {
    locationImage,
    currentLocation,
    isLoading: isImageLoading,
    generateImage: generateLocationImage,
    clearImage: clearLocationImage,
  } = useLocationImage(sessionId || '');

  const {
    maps,
    isLoading: isMapsLoading,
    fetchMaps,
    addMap,
    generateMap,
    updateMap,
    deleteMap,
  } = useMaps(sessionId || '');

  const syncActiveCombat = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await get<{ success: boolean; session?: { combats?: unknown[] } }>(
        `/sessions/${sessionId}`
      );

      const rawCombats = response?.session?.combats;
      if (!Array.isArray(rawCombats) || rawCombats.length === 0) {
        setActiveCombat(null);
        return;
      }

      const normalizedCombats = rawCombats
        .map((combatEntry) => parseCombatValue(combatEntry))
        .filter((combatEntry): combatEntry is Combat => combatEntry !== null);

      const active = normalizedCombats.find((combatEntry) => combatEntry.status === "active") || null;
      if (!active) {
        setActiveCombat(null);
        return;
      }

      try {
        const combatResponse = await get<{ success: boolean; combat?: unknown }>(
          `/combat/${active.id}`
        );
        const parsedCombat = combatResponse?.combat ? parseCombatValue(combatResponse.combat) : null;
        const combatToSet = parsedCombat || active;
        setActiveCombat(combatToSet.status === "active" ? combatToSet : null);
      } catch (detailError) {
        console.error("Combat detail sync error:", detailError);
        setActiveCombat(active);
      }
    } catch (err) {
      console.error("Combat sync error:", err);
    }
  }, [sessionId]);

  const performCombatAction = useCallback(async (
    actionText: string,
    options?: {
      targetName?: string;
      targetId?: string;
      damage?: number;
      attack?: boolean;
    }
  ): Promise<CombatResolution | null> => {
    if (!activeCombat) return null;

    const normalizedTargetName = options?.targetName?.trim().toLowerCase();
    const targetParticipant = options?.targetId
      ? activeCombat.participants.find((participant) => participant.id === options.targetId)
      : normalizedTargetName
      ? activeCombat.participants.find(
          (participant) => participant.name.trim().toLowerCase() === normalizedTargetName
        )
      : activeCombat.participants.find(
          (participant) => participant.type === "enemy" && participant.hp > 0
        );

    const playerIdentity = (character?.name || playerName).trim().toLowerCase();
    const actorParticipant =
      activeCombat.participants.find((participant) => participant.id === character?.id) ||
      activeCombat.participants.find(
        (participant) => participant.name.trim().toLowerCase() === playerIdentity
      );

    try {
      const response = await post<{ success: boolean; combat?: unknown; resolution?: CombatResolution }>(
        `/combat/${activeCombat.id}/action`,
        {
          action: actionText,
          actorId: actorParticipant?.id,
          targetId: targetParticipant?.id,
          damage: options?.damage,
          // When the player targets an enemy, resolve it as a real attack
          // (server rolls d20 vs AC and applies damage on a hit).
          attack: options?.attack ?? (targetParticipant?.type === "enemy"),
        }
      );

      if (!response?.success) {
        return null;
      }

      const parsedCombat = response.combat ? parseCombatValue(response.combat) : null;
      if (parsedCombat) {
        setActiveCombat(parsedCombat.status === "active" ? parsedCombat : null);
      } else {
        await syncActiveCombat();
      }

      await fetchMessages();
      return response.resolution ?? ({} as CombatResolution);
    } catch (err) {
      console.error("Combat action endpoint error:", err);
      return null;
    }
  }, [activeCombat, character?.id, character?.name, playerName, fetchMessages, syncActiveCombat]);

  // Unifies the two combat paths: after the mechanical engine resolves an action,
  // ask the AI to narrate the REAL outcome (hit/miss, damage, remaining HP) rather
  // than inventing a separate, disconnected result.
  const narrateCombatResolution = useCallback(async (
    resolution: CombatResolution,
    actionText: string,
  ) => {
    const combatResult = await combatAction({
      action: actionText,
      attacker: resolution.actorName || character?.name || playerName,
      target: resolution.targetName || undefined,
      rollResult: resolution.attackRoll ?? undefined,
      damage: resolution.damage,
      combatId: activeCombat?.id,
      hit: resolution.hit,
      crit: resolution.crit,
      defeated: resolution.targetDefeated,
      combatEnded: resolution.combatEnded,
      targetHpRemaining: resolution.targetHpRemaining ?? undefined,
      targetMaxHp: resolution.targetMaxHp ?? undefined,
    });

    if (combatResult?.success && combatResult.combatNarration) {
      addMessage({
        id: combatResult.messageId || `combat-${Date.now()}`,
        sessionId: sessionId || "",
        senderType: "GM",
        senderName: "Game Master",
        content: combatResult.combatNarration,
        timestamp: combatResult.timestamp || new Date().toISOString(),
      });
    }
  }, [combatAction, activeCombat?.id, character?.name, playerName, addMessage, sessionId]);

  // Resolves which enemy a combat action targets: the player's selection if it is
  // still alive, otherwise the first living enemy.
  const getCombatTarget = useCallback(() => {
    if (!activeCombat) return undefined;
    const aliveEnemies = activeCombat.participants.filter(
      (participant) => participant.type === "enemy" && participant.hp > 0,
    );
    if (selectedTargetId) {
      const chosen = aliveEnemies.find((participant) => participant.id === selectedTargetId);
      if (chosen) return chosen;
    }
    return aliveEnemies[0];
  }, [activeCombat, selectedTargetId]);

  // SSE real-time + polling fallback
  const lastSyncTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!sessionId || gamePhase !== 'playing') return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let isDestroyed = false;

    const pollFallback = async () => {
      try {
        const result = await fetchUpdates(lastSyncTime.current);
        if (result?.updates?.messages?.length || result?.updates?.gameStateChanged) {
          lastSyncTime.current = Date.now();
        }
      } catch (err) {
        console.error('Fallback polling error:', err);
      }
    };

    const enablePollingFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(() => {
        void pollFallback();
      }, 5000);
    };

    const connectSSE = () => {
      const since = new Date(lastSyncTime.current).toISOString();
      const eventsUrl = `/api/sessions/${sessionId}/events?since=${encodeURIComponent(since)}`;
      eventSource = new EventSource(eventsUrl);

      eventSource.addEventListener('update', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            updates?: {
              messages?: Message[];
              gameStateChanged?: boolean;
            };
          };

          const updatePayload = payload.updates;
          if (updatePayload?.messages && updatePayload.messages.length > 0) {
            addMessages(updatePayload.messages);
          }

          if (updatePayload?.gameStateChanged) {
            void fetchGameState();
          }

          lastSyncTime.current = Date.now();
        } catch (error) {
          console.error('SSE update parse error:', error);
        }
      });

      eventSource.addEventListener('error', () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        if (!isDestroyed) {
          enablePollingFallback();
        }
      });
    };

    connectSSE();

    return () => {
      isDestroyed = true;
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [sessionId, gamePhase, addMessages, fetchGameState, fetchUpdates]);

  useEffect(() => {
    if (!sessionId || gamePhase !== "playing") return;
    void syncActiveCombat();
  }, [sessionId, gamePhase, syncActiveCombat]);

  const lastCombatMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId || gamePhase !== "playing") return;

    const lastCombatMessage = [...messages].reverse().find((message) => message.senderType === "COMBAT");
    if (!lastCombatMessage) return;
    if (lastCombatMessage.id === lastCombatMessageIdRef.current) return;

    lastCombatMessageIdRef.current = lastCombatMessage.id;
    void syncActiveCombat();
  }, [messages, sessionId, gamePhase, syncActiveCombat]);

  const lastDiceMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId || gamePhase !== "playing") return;

    const lastDiceMessage = [...messages].reverse().find((message) => message.senderType === "DICE");
    if (!lastDiceMessage) return;
    if (lastDiceMessage.id === lastDiceMessageIdRef.current) return;

    lastDiceMessageIdRef.current = lastDiceMessage.id;
    setDiceHistoryRefreshSignal((prev) => prev + 1);
  }, [messages, sessionId, gamePhase]);

  useEffect(() => {
    if (!actionError) return;
    const timeout = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(timeout);
  }, [actionError]);

  // Sayfa yüklendiğinde (F5 / ilk açılış) kaydedilmiş suggestions'ı mesajlardan oku
  const lastCheckedGMMessageId = useRef<string | null>(null);
  useEffect(() => {
    if (
      gamePhase !== 'playing' ||
      !sessionId ||
      messages.length === 0 ||
      suggestions.length > 0 ||
      isSuggestionsLoading
    ) return;

    // Son GM mesajını bul
    const lastGM = [...messages].reverse().find(m => m.senderType === 'GM');
    if (!lastGM) return;

    // GM zaten aksiyon seçeneği sunmuşsa suggestions gösterme
    if (lastGM.gmPrompt?.actions && lastGM.gmPrompt.actions.length > 0) return;

    // Bu mesajda kaydedilmiş suggestions varsa yükle
    if (lastGM.suggestions && lastGM.suggestions.length > 0) {
      lastCheckedGMMessageId.current = lastGM.id;
      loadSuggestionsFromMessages(messages);
      return;
    }

    // Suggestions yoksa ve bu mesajı daha önce kontrol ettiysek tekrar deneme
    // (fetchSession parsed olmadan gelmiş olabilir, fetchMessages ile tekrar gelecek)
    if (lastCheckedGMMessageId.current === lastGM.id) return;
    lastCheckedGMMessageId.current = lastGM.id;
  }, [gamePhase, sessionId, messages, suggestions.length, isSuggestionsLoading, loadSuggestionsFromMessages]);

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
      setError('Oturum duraklatılamadı');
    }
  };

  const handleDescribeCurrentLocation = async () => {
    if (!sessionId || isGMLoading) return;

    const locationName =
      currentLocation ||
      gameState?.location ||
      worldSettings?.startingLocation?.name ||
      "Bilinmeyen Mekan";

    const recentGmDetails = messages
      .filter((message) => message.senderType === "GM")
      .slice(-2)
      .map((message) => message.content.slice(0, 140))
      .filter((content) => content.length > 0);

    const result = await describeLocation({
      locationName,
      locationType: "other",
      atmosphere: worldSettings?.startingLocation?.atmosphere || gameState?.weather || "mysterious",
      details: recentGmDetails.length > 0 ? recentGmDetails : undefined,
    });

    if (result?.success && result.locationDescription) {
      const gmMessage: Message = {
        id: result.messageId || `gm-location-${Date.now()}`,
        sessionId: sessionId || "",
        senderType: "GM",
        senderName: "Game Master",
        content: result.locationDescription,
        timestamp: result.timestamp || new Date().toISOString(),
      };
      addMessage(gmMessage);
      void fetchGameState();
      fetchSuggestions(result.locationDescription, result.messageId);
    }
  };

  const handleTalkToNPC = async (npc: { id: string; name: string }) => {
    if (!sessionId) return;

    clearSuggestions();
    setPendingMandatoryAction(null);

    const defaultPlayerPrompt = `${npc.name}, burada neler olduğunu anlatır mısın?`;
    const tempId = `temp-npc-talk-${Date.now()}`;
    addMessage({
      id: tempId,
      sessionId,
      senderType: "PLAYER",
      senderName: character?.name || playerName,
      content: defaultPlayerPrompt,
      timestamp: new Date().toISOString(),
    });

    const result = await npcDialogue(npc.id, defaultPlayerPrompt);
    removeMessage(tempId);

    if (result?.success && result.dialogue) {
      await fetchMessages();
      fetchSuggestions(result.dialogue, result.messageId);
      return;
    }

    await handleSendMessage(`${npc.name} ile konuşmak istiyorum`);
  };


  // Son GM mesajında hazır aksiyonlar var mı?
  const lastGMHasActions = (() => {
    const lastGM = [...messages].reverse().find(m => m.senderType === 'GM');
    return !!(lastGM?.gmPrompt?.actions && lastGM.gmPrompt.actions.length > 0);
  })();

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
        <h1 className="text-2xl font-bold mb-4">Oturum bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Oturumlara Dön</Button>
        </Link>
      </div>
    );
  }

  // Kullanıcı oturum creator mı? (erken tanımlama)
  const isCreator = campaign?.creatorId === authSession?.user?.id;

  if (campaign?.status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Oturum Tamamlandı</h1>
        <p className="text-muted-foreground mb-4">Bu oturum zaten tamamlanmış.</p>
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
            Bu oturuma katılmak için önce bir karakter oluşturmanız gerekiyor.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`/campaigns/${campaignId}/characters/new`}>
              <Button className="w-full">Karakter Oluştur</Button>
            </Link>
            <Link href={`/campaigns/${campaignId}`}>
              <Button variant="outline" className="w-full">Oturuma Dön</Button>
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

    // Optimistic UI update - Show player message immediately
    const tempId = `temp-player-${Date.now()}`;
    const tempPlayerMessage: Message = {
      id: tempId,
      sessionId: sessionId || '',
      senderType: 'PLAYER',
      senderName: character?.name || playerName,
      content: content,
      timestamp: new Date().toISOString(),
    };
    addMessage(tempPlayerMessage);

    // AI GM çağrısı yap - API hem oyuncu mesajını hem GM yanıtını kaydeder
    const result = await narrate(content);

    // Temp mesajı kaldır
    removeMessage(tempId);

    if (result && result.narration) {
      // API'den dönen mesajları al
      // Oyuncu mesajı - gerçek ID ile ekle
      if (result.playerMessageId) {
        const playerMessage: Message = {
          id: result.playerMessageId,
          sessionId: sessionId || '',
          senderType: 'PLAYER',
          senderName: result.playerName || character?.name || playerName,
          content: content,
          timestamp: result.playerMessageTimestamp || new Date().toISOString(),
        };
        addMessage(playerMessage);
      }

      // GM yanıtı
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
        // GM aksiyon önerileri vermemişse AI suggestions getir
        const hasGMActions = result.gmPrompt?.actions && result.gmPrompt.actions.length > 0;
        if (!hasGMActions) {
          fetchSuggestions(result.narration, result.messageId);
        } else {
          // GM aksiyon vermiş, suggestions'ı temizle
          clearSuggestions();
        }
      }
    }
  };

  // Aksiyon seçimi handler'ı
  const handleActionSelect = async (action: GMAction, messageId: string) => {
    // Önerileri temizle
    clearSuggestions();

    // Zorunlu aksiyon state'ini temizle
    setPendingMandatoryAction(null);

    // AI'ya seçimi gönder - API oyuncu mesajını da kaydeder
    const actionContent = `[${action.label}] ${action.description || action.value || ''}`.trim();

    if (activeCombat?.status === "active") {
      const combatTarget = getCombatTarget();
      const resolution = await performCombatAction(actionContent, {
        targetId: combatTarget?.id,
        targetName: combatTarget?.name,
      });
      if (resolution) {
        // Mechanical action succeeded → narrate the real resolved outcome.
        await narrateCombatResolution(resolution, actionContent);
        return;
      }

      // Mechanical action did not apply (e.g. not your turn): plain AI narration,
      // still linked to the real combat so its state stays consistent.
      const combatResult = await combatAction({
        action: actionContent,
        attacker: character?.name || playerName,
        target: combatTarget?.name,
        combatId: activeCombat.id,
      });

      if (combatResult?.success && combatResult.combatNarration) {
        addMessage({
          id: combatResult.messageId || `combat-${Date.now()}`,
          sessionId: sessionId || "",
          senderType: "GM",
          senderName: "Game Master",
          content: combatResult.combatNarration,
          timestamp: combatResult.timestamp || new Date().toISOString(),
        });
        return;
      }
    }

    const result = await narrate(`${action.label}: ${action.value || action.description || ''}`);

    if (result && result.narration) {
      // Oyuncu mesajı (API'den dönen ID ile)
      if (result.playerMessageId) {
        const playerMessage: Message = {
          id: result.playerMessageId,
          sessionId: sessionId || '',
          senderType: 'PLAYER',
          senderName: result.playerName || character?.name || playerName,
          content: actionContent,
          timestamp: result.playerMessageTimestamp || new Date().toISOString(),
        };
        addMessage(playerMessage);
      }

      // GM yanıtı
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
        // GM aksiyon önerileri vermemişse AI suggestions getir
        const hasGMActions = result.gmPrompt?.actions && result.gmPrompt.actions.length > 0;
        if (!hasGMActions) {
          fetchSuggestions(result.narration, result.messageId);
        } else {
          clearSuggestions();
        }
      }
    }
  };

  const handleStartCombat = async () => {
    if (!sessionId || isCombatLoading) return;

    setActionError(null);
    setIsCombatLoading(true);
    try {
      const response = await post<{ success: boolean; combat?: unknown }>(
        `/sessions/${sessionId}/combat/start`,
        {}
      );

      const parsedCombat = response?.combat ? parseCombatValue(response.combat) : null;
      if (response?.success && parsedCombat) {
        setActiveCombat(parsedCombat);
      } else {
        await syncActiveCombat();
      }
    } catch (err) {
      const userMessage = err instanceof APIError
        ? err.message
        : "Savaş başlatılırken bir hata oluştu.";
      setActionError(userMessage);
      if (!(err instanceof APIError)) {
        console.error("Combat start error:", err);
      }
    } finally {
      setIsCombatLoading(false);
    }
  };

  const handleNextCombatTurn = async () => {
    if (!activeCombat || isCombatLoading) return;

    setActionError(null);
    setIsCombatLoading(true);
    try {
      const response = await post<{ success: boolean; combat?: unknown }>(
        `/combat/${activeCombat.id}/next-turn`,
        {}
      );
      const parsedCombat = response?.combat ? parseCombatValue(response.combat) : null;
      if (response?.success && parsedCombat) {
        setActiveCombat(parsedCombat);
      } else {
        await syncActiveCombat();
      }
    } catch (err) {
      const userMessage = err instanceof APIError
        ? err.message
        : "Sonraki tura geçilirken bir hata oluştu.";
      setActionError(userMessage);
      if (!(err instanceof APIError)) {
        console.error("Next turn error:", err);
      }
    } finally {
      setIsCombatLoading(false);
    }
  };

  const handleEndCombat = async () => {
    if (!activeCombat || isCombatLoading) return;

    setActionError(null);
    setIsCombatLoading(true);
    try {
      const response = await post<{ success: boolean; combat?: unknown }>(
        `/combat/${activeCombat.id}/end`,
        {}
      );
      const parsedCombat = response?.combat ? parseCombatValue(response.combat) : null;
      if (response?.success && parsedCombat) {
        setActiveCombat(parsedCombat.status === "active" ? parsedCombat : null);
      } else {
        setActiveCombat(null);
      }
    } catch (err) {
      const userMessage = err instanceof APIError
        ? err.message
        : "Savaş bitirilirken bir hata oluştu.";
      setActionError(userMessage);
      if (!(err instanceof APIError)) {
        console.error("End combat error:", err);
      }
    } finally {
      setIsCombatLoading(false);
    }
  };

  // Zar atışı handler'ı (ActionButtons'dan)
  const handleActionDiceRoll = async (action: GMAction, messageId: string) => {
    // Zorunlu aksiyon state'ini temizle
    setPendingMandatoryAction(null);

    const diceType = action.diceType || "d20";
    const diceCount = action.diceCount || 1;
    const diceModifier = action.modifier || 0;
    const rollPurpose = action.skill
      ? `${action.skill} kontrolü`
      : action.label || "Aksiyon zarı";

    const diceResponse = await rollDice(diceType, diceCount, diceModifier, {
      purpose: rollPurpose,
      characterId: character?.id,
    });

    if (diceResponse?.success && diceResponse.message) {
      addMessage(diceResponse.message);
    }

    if (!diceResponse?.success || typeof diceResponse.total !== "number") {
      return;
    }

    const isSuccess = typeof action.dc === "number" ? diceResponse.total >= action.dc : undefined;
    const actionText = `${action.skill || action.label || 'Zar'} kontrolü attım. Sonuç: ${diceResponse.total}${
      isSuccess !== undefined ? (isSuccess ? " (Başarılı)" : " (Başarısız)") : ""
    }`;

    if (activeCombat?.status === "active") {
      const combatTarget = getCombatTarget();
      const resolution = await performCombatAction(actionText, {
        targetId: combatTarget?.id,
        targetName: combatTarget?.name,
      });
      if (resolution) {
        await narrateCombatResolution(resolution, actionText);
        return;
      }

      const combatResult = await combatAction({
        action: actionText,
        attacker: character?.name || playerName,
        target: combatTarget?.name,
        rollResult: diceResponse.total,
        combatId: activeCombat.id,
      });

      if (combatResult?.success && combatResult.combatNarration) {
        addMessage({
          id: combatResult.messageId || `combat-${Date.now()}`,
          sessionId: sessionId || "",
          senderType: "GM",
          senderName: "Game Master",
          content: combatResult.combatNarration,
          timestamp: combatResult.timestamp || new Date().toISOString(),
        });
      }
      return;
    }

    // AI'ya zar sonucunu bildir - skipPlayerMessageSave ile oyuncu mesajı kaydetme
    const result = await narrate(actionText, { skipPlayerMessageSave: true });

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
        // GM aksiyon önerileri vermemişse AI suggestions getir
        const hasGMActions = result.gmPrompt?.actions && result.gmPrompt.actions.length > 0;
        if (!hasGMActions) {
          fetchSuggestions(result.narration, result.messageId);
        } else {
          clearSuggestions();
        }
      }
    }
  };

  const handleDiceRoll = async (
    diceType: DiceType,
    count: number,
    modifier: number,
    rollMode: "normal" | "advantage" | "disadvantage" = "normal",
  ) => {
    const diceResponse = await rollDice(diceType, count, modifier, {
      purpose: "Manuel zar atışı",
      advantage: rollMode === "advantage",
      disadvantage: rollMode === "disadvantage",
      characterId: character?.id,
    });

    if (diceResponse?.success && diceResponse.message) {
      addMessage(diceResponse.message);
      return {
        results: Array.isArray(diceResponse.results) ? diceResponse.results : [],
        total:
          typeof diceResponse.total === "number"
            ? diceResponse.total
            : 0,
      };
    }

    const diceSides = Number.parseInt(diceType.replace("d", ""), 10);
    if (diceType === "d20" && count === 1 && rollMode !== "normal") {
      const rollA = Math.floor(Math.random() * 20) + 1;
      const rollB = Math.floor(Math.random() * 20) + 1;
      const chosen = rollMode === "advantage" ? Math.max(rollA, rollB) : Math.min(rollA, rollB);
      return {
        results: [rollA, rollB],
        total: chosen + modifier,
      };
    }

    const fallbackResults = Array.from({ length: Math.max(1, count) }, () => (
      Math.floor(Math.random() * Math.max(1, diceSides)) + 1
    ));

    return {
      results: fallbackResults,
      total: fallbackResults.reduce((sum, value) => sum + value, 0) + modifier,
    };
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
          // GM aksiyon önerileri vermemişse AI suggestions getir
          const hasGMActions = result.gmPrompt?.actions && result.gmPrompt.actions.length > 0;
          if (!hasGMActions) {
            fetchSuggestions(result.narration, result.messageId);
          } else {
            clearSuggestions();
          }
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
            <h1 className="font-semibold">{campaign?.name || 'Oturum'}</h1>
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
          {/* Combat Tracker - Savaş sırasında göster */}
          {activeCombat && activeCombat.status === "active" && (
            <div className="px-4 pt-3 pb-1">
              <CombatTracker
                combat={activeCombat}
                isGameMaster={isCreator}
                onNextTurn={handleNextCombatTurn}
                onEndCombat={handleEndCombat}
              />
              {/* Players pick which enemy their next action targets. */}
              {!isCreator && (
                <div className="mt-2">
                  <TargetSelector
                    combat={activeCombat}
                    selectedTargetId={selectedTargetId}
                    onSelect={setSelectedTargetId}
                  />
                </div>
              )}
            </div>
          )}
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
            {(actionError || gameError || gmError) && (
              <div className="px-4 pb-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <span>{actionError || gameError || gmError}</span>
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

            {/* AI Action Suggestions - Sadece son GM mesajında hazır aksiyon yoksa göster */}
            {!pendingMandatoryAction?.isMandatory &&
              !lastGMHasActions &&
              (suggestions.length > 0 || isSuggestionsLoading) && (
                <ActionSuggestions
                  suggestions={suggestions}
                  isLoading={isSuggestionsLoading}
                  onSelect={(detailedAction) => handleSendMessage(detailedAction)}
                  onRefresh={() => {
                    const lastGM = [...messages].reverse().find(m => m.senderType === 'GM');
                    if (lastGM) {
                      fetchSuggestions(lastGM.content, lastGM.id);
                    }
                  }}
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
                onClick={() => setShowMapModal(true)}
                className="gap-1"
              >
                <Map className="h-4 w-4" />
                Haritalar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDescribeCurrentLocation()}
                disabled={isGMLoading || isGameLoading}
                className="gap-1"
              >
                <Globe className="h-4 w-4" />
                Mekanı Betimle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeCombat?.status === "active") {
                    void handleEndCombat();
                  } else {
                    void handleStartCombat();
                  }
                }}
                disabled={isCombatLoading || isGMLoading || isGameLoading}
                className="gap-1"
              >
                <Swords className={cn("h-4 w-4", isCombatLoading && "animate-pulse")} />
                {activeCombat?.status === "active" ? "Savaşı Bitir" : "Savaş Başlat"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSidePanelMode((prev) => (prev === "dice" ? null : "dice"))
                }
                className={cn(
                  "gap-1",
                  sidePanelMode === "dice" && "bg-primary/10 border-primary"
                )}
              >
                🎲 Zar Geçmişi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSidePanelMode((prev) => (prev === "characters" ? null : "characters"))
                }
                className={cn(
                  "gap-1",
                  sidePanelMode === "characters" && "bg-primary/10 border-primary"
                )}
              >
                🧙 Karakter
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel - Karakterler / Zar Geçmişi */}
        {sidePanelMode && (
          <aside className="w-80 border-l border-border bg-background-secondary overflow-y-auto animate-slide-up">
            <div className="p-4">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {sidePanelMode === "characters" ? "Karakterler" : "Zar Geçmişi"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidePanelMode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {sidePanelMode === "characters" ? (
                <>
                  {/* Karakter Listesi */}
                  <div className="space-y-2">
                    {allPlayers.length > 0 ? (
                      allPlayers.map((player) => {
                        const char = player.character;
                        const isMe = player.userId === authSession?.user?.id;
                        return (
                          <button
                            key={player.userId}
                            onClick={() => {
                              if (char) {
                                setSelectedCharacterForModal(char);
                                setShowCharacterModal(true);
                              }
                            }}
                            disabled={!char}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                              char
                                ? "hover:border-primary/50 hover:bg-background-elevated cursor-pointer"
                                : "opacity-50 cursor-not-allowed",
                              isMe
                                ? "border-primary/30 bg-primary/5"
                                : "border-border"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                              isMe ? "bg-primary/20 text-primary" : "bg-background-elevated text-foreground-muted"
                            )}>
                              {char ? char.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/players/${player.userId}`}
                                  className="font-medium text-sm truncate hover:text-primary transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {char?.name || player.username}
                                </Link>
                                {isMe && (
                                  <Badge variant="primary" size="sm">Sen</Badge>
                                )}
                              </div>
                              {char ? (
                                <p className="text-xs text-foreground-muted truncate">
                                  Lv.{char.level} {char.race} {char.class}
                                </p>
                              ) : (
                                <p className="text-xs text-foreground-muted italic">
                                  Karakter seçmedi
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      /* Solo mod veya veri yüklenemedi - sadece kendi karakterini göster */
                      character && (
                        <button
                          onClick={() => {
                            setSelectedCharacterForModal(character);
                            setShowCharacterModal(true);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-background-elevated transition-all text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-primary/20 text-primary">
                            {character.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{character.name}</p>
                              <Badge variant="primary" size="sm">Sen</Badge>
                            </div>
                            <p className="text-xs text-foreground-muted truncate">
                              Lv.{character.level} {character.race} {character.class}
                            </p>
                          </div>
                        </button>
                      )
                    )}
                  </div>

                  <p className="text-xs text-foreground-muted text-center mt-4">
                    Detay görmek için karaktere tıkla
                  </p>
                </>
              ) : (
                <>
                  <DiceHistory
                    sessionId={sessionId || ""}
                    characterId={character?.id}
                    limit={20}
                    refreshSignal={diceHistoryRefreshSignal}
                  />
                  <p className="text-xs text-foreground-muted text-center mt-4">
                    Zar geçmişi bu oturum için canlı güncellenir
                  </p>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Character Detail Modal */}
      <CharacterModal
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        character={selectedCharacterForModal}
      />

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
          canManage={isCreator}
          onTalkToNPC={(npc) => {
            void handleTalkToNPC(npc);
          }}
        />
      )}

      {/* Map Modal */}
      {sessionId && (
        <MapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          sessionId={sessionId}
          maps={maps}
          isLoading={isMapsLoading}
          currentLocation={currentLocation}
          worldName={worldSettings?.worldName || campaign?.name}
          onMapCreated={(map) => {
            // Map is automatically added by useMaps hook
          }}
          onMapDelete={async (mapId) => {
            await deleteMap(mapId);
          }}
          onMapUpdate={async (mapId, data) => {
            await updateMap(mapId, data);
          }}
          onRefresh={fetchMaps}
        />
      )}
    </div>
  );
}
