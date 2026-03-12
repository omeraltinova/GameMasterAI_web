/**
 * useGame Hook - Oyun ile ilgili API çağrıları ve state yönetimi
 */

import { useState, useEffect, useCallback } from 'react';
import { get, post, put, buildQuery, APIError } from '@/lib/api/client';
import { useGameStore } from '@/store/gameStore';
import type {
  Message,
  Suggestion,
  GameSession,
  GameState,
  Character,
  Campaign,
  DiceType,
  GMPrompt
} from '@/types';

/**
 * useGame Hook - Oyun session yönetimi
 */
export function useGame(sessionId: string) {
  const session = useGameStore((state) => state.session);
  const gameState = useGameStore((state) => state.gameState);
  const messages = useGameStore((state) => state.messages);
  const setSession = useGameStore((state) => state.setSession);
  const setGameState = useGameStore((state) => state.setGameState);
  const setMessages = useGameStore((state) => state.setMessages);
  const addMessageToStore = useGameStore((state) => state.addMessage);
  const addMessagesToStore = useGameStore((state) => state.addMessages);
  const removeMessageFromStore = useGameStore((state) => state.removeMessage);
  const resetStore = useGameStore((state) => state.reset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Session detaylarını getir
   */
  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await get<{ success: boolean; session: GameSession & { messages?: Message[] } }>(
        `/sessions/${sessionId}`
      );
      if (data.success && data.session) {
        setSession(data.session);
        // Session'dan gelen mesajları da set et
        if (data.session.messages) {
          setMessages(data.session.messages);
        }
      }
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Session yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Oyun durumunu getir
   */
  const fetchGameState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await get<{ success: boolean; state: GameState }>(`/sessions/${sessionId}/state`);
      if (data?.state) {
        setGameState(data.state);
      }
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Oyun durumu yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Mesaj geçmişini getir
   */
  const fetchMessages = useCallback(async (page = 1, limit = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const query = buildQuery({ offset, limit });
      const data = await get<{
        success: boolean;
        messages: Message[];
        pagination: { total: number }
      }>(
        `/sessions/${sessionId}/messages${query}`
      );
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Mesajlar yüklenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Son güncellemeleri getir (polling)
   */
  const fetchUpdates = useCallback(async (since?: number) => {
    // Don't set loading state for polling to avoid UI flicker
    setError(null);
    try {
      // Convert timestamp to ISO string for API
      const sinceDate = since ? new Date(since).toISOString() : undefined;
      const query = buildQuery({ since: sinceDate });
      const data = await get<{
        success: boolean;
        updates: {
          messages: Message[];
          gameStateChanged: boolean;
        };
      }>(`/sessions/${sessionId}/updates${query}`);

      const updates = data?.updates;
      if (updates?.messages && updates.messages.length > 0) {
        addMessagesToStore(updates.messages);
      }

      if (updates?.gameStateChanged) {
        const stateData = await get<{ success: boolean; state: GameState }>(`/sessions/${sessionId}/state`);
        if (stateData?.state) {
          setGameState(stateData.state);
        }
      }

      return data;
    } catch (err) {
      // Silent error for polling - don't show error to user
      console.error('Polling error:', err);
      return null;
    }
  }, [sessionId]);

  /**
   * Mesaj gönder
   */
  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{ success: boolean; message: Message }>(`/sessions/${sessionId}/messages`, {
        content,
        senderType: 'PLAYER',
      });
      if (data?.message) {
        addMessageToStore(data.message);
        return data.message;
      }
      return null;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Mesaj gönderilemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Session güncelle
   */
  const updateSession = useCallback(async (updates: Partial<GameSession>) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await put<GameSession>(`/sessions/${sessionId}`, updates);
      setSession(data);
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Session güncellenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Mesaj ekle (dışarıdan mesaj ekleme için)
   */
  const addMessage = useCallback((message: Message) => {
    addMessageToStore(message);
  }, [addMessageToStore]);

  /**
   * Birden fazla mesaj ekle
   */
  const addMessages = useCallback((newMessages: Message[]) => {
    addMessagesToStore(newMessages);
  }, [addMessagesToStore]);

  /**
   * Mesaj sil (temp mesajları kaldırmak için)
   */
  const removeMessage = useCallback((id: string) => {
    removeMessageFromStore(id);
  }, [removeMessageFromStore]);

  /**
   * Hata durumunu temizle
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Component mount olduğunda session ve mesajları getir
   * Sadece sessionId varsa çağır
   */
  useEffect(() => {
    if (!sessionId) {
      return;
    }
    resetStore();
    fetchSession();
    fetchMessages();
  }, [sessionId, fetchSession, fetchMessages, resetStore]);

  return {
    session,
    gameState,
    messages,
    isLoading,
    error,
    fetchSession,
    fetchGameState,
    fetchMessages,
    fetchUpdates,
    sendMessage,
    updateSession,
    addMessage,
    addMessages,
    removeMessage,
    clearError,
  };
}

/**
 * useGM Hook - AI Game Master API çağrıları
 */
export function useGM(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Hikaye anlatımı (narration)
   */
  const narrate = useCallback(async (playerAction: string, options?: { skipPlayerMessageSave?: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{
        success: boolean;
        narration: string;
        gmPrompt?: GMPrompt;
        locationChange?: {
          changed: boolean;
          newLocation?: string;
          locationType?: string;
          description?: string;
        };
        messageId: string;
        timestamp: string;
        // Oyuncu mesajı bilgileri
        playerMessageId?: string;
        playerMessageTimestamp?: string;
        playerName?: string;
      }>(
        '/gm/narrate',
        {
          sessionId,
          playerAction,
          skipPlayerMessageSave: options?.skipPlayerMessageSave,
        }
      );
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Hikaye anlatılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * NPC diyalog
   */
  const npcDialogue = useCallback(async (
    npcId: string,
    playerMessage: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{
        success: boolean;
        npcName: string;
        dialogue: string;
        messageId: string;
        timestamp: string;
      }>(
        '/gm/npc-dialogue',
        {
          sessionId,
          npcId,
          playerMessage,
        }
      );
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'NPC konuşamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Lokasyon betimleme
   */
  const describeLocation = useCallback(async (params: {
    locationName: string;
    locationType?: string;
    atmosphere?: string;
    details?: string[] | string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{
        success: boolean;
        locationDescription: string;
        messageId: string;
        timestamp: string;
        gameState: GameState;
      }>(
        '/gm/describe-location',
        {
          sessionId,
          ...params,
        }
      );
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Lokasyon betimlenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Savaş aksiyonu yorumlama
   */
  const combatAction = useCallback(async (params: {
    action: string;
    attacker?: string;
    target?: string;
    rollResult?: number;
    damage?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{
        success: boolean;
        combatNarration: string;
        messageId: string;
        timestamp: string;
        gameState: GameState;
      }>(
        '/gm/combat-action',
        {
          sessionId,
          ...params,
        }
      );
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Savaş aksiyonu yorumlanamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    isLoading,
    error,
    narrate,
    npcDialogue,
    describeLocation,
    combatAction,
  };
}

// Suggestion tipi artık types/index.ts'den geliyor
export type { Suggestion } from '@/types';

interface LocationImageOptions {
  createMessage?: boolean;
  messageContent?: string;
  excludeFromContext?: boolean;
}

/**
 * useSuggestions Hook - AI aksiyon önerileri
 * Kaydedilmiş önerileri mesajdan yükler, yeni önerileri API'den alır ve DB'ye kaydeder
 */
export function useSuggestions(sessionId: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mesajlardan kaydedilmiş önerileri yükle (API çağrısı yapmaz)
   */
  const loadSuggestionsFromMessages = useCallback((messages: Message[]) => {
    // Son GM mesajını bul
    const lastGM = [...messages].reverse().find(m => m.senderType === 'GM');
    if (!lastGM) return;

    // GM zaten aksiyon seçeneği sunmuşsa suggestions gösterme
    if (lastGM.gmPrompt?.actions && lastGM.gmPrompt.actions.length > 0) {
      setSuggestions([]);
      return;
    }

    // Kaydedilmiş suggestions varsa yükle
    if (lastGM.suggestions && lastGM.suggestions.length > 0) {
      setSuggestions(lastGM.suggestions);
    }
  }, []);

  /**
   * Yeni öneriler getir (API çağrısı yapar - Yeniden Öner butonu veya ilk oluşturma)
   */
  const fetchSuggestions = useCallback(async (lastGMMessage: string, messageId?: string) => {
    if (!sessionId) return null;

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const data = await post<{
        success: boolean;
        suggestions: Suggestion[];
      }>(
        '/gm/suggestions',
        {
          sessionId,
          lastGMMessage,
          messageId,
        }
      );

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      }
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Öneriler yüklenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Önerileri temizle
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    loadSuggestionsFromMessages,
    clearSuggestions,
  };
}

/**
 * useLocationImage Hook - Mekan görseli üretimi
 */
export function useLocationImage(sessionId: string) {
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);

  /**
   * Mekan görseli üret
   */
  const generateImage = useCallback(async (
    locationName: string,
    locationType: string,
    description: string,
    options?: LocationImageOptions
  ) => {
    if (!sessionId) {
      console.log('[useLocationImage] No sessionId, skipping');
      return null;
    }

    console.log(`[useLocationImage] Generating image for: ${locationName}`);
    console.log(`[useLocationImage] Type: ${locationType}, Description length: ${description.length}`);

    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        sessionId,
        locationName,
        locationType,
        description,
      };

      if (options?.createMessage) {
        payload.createMessage = true;
        payload.messageContent = options.messageContent;
        payload.excludeFromContext = options.excludeFromContext;
      }

      const data = await post<{
        success: boolean;
        imageUrl?: string;
        error?: string;
        message?: Message;
      }>(
        '/gm/generate-location-image',
        payload
      );

      console.log(`[useLocationImage] Response:`, { success: data.success, hasUrl: !!data.imageUrl, error: data.error });

      if (data.success && data.imageUrl) {
        setLocationImage(data.imageUrl);
        setCurrentLocation(locationName);
      } else if (data.error) {
        setError(data.error);
      }
      return data;
    } catch (err) {
      console.error('[useLocationImage] Error:', err);
      setError(err instanceof APIError ? err.message : 'Görsel üretilemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Görseli temizle (yükleme sırasında da kapanabilmesi için isLoading'i sıfırla)
   */
  const clearImage = useCallback(() => {
    setLocationImage(null);
    setCurrentLocation(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    locationImage,
    currentLocation,
    isLoading,
    error,
    generateImage,
    clearImage,
  };
}

/**
 * useDice Hook - Zar sistemi
 */
export function useDice(sessionId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type DiceRollOptions = {
    purpose?: string;
    advantage?: boolean;
    disadvantage?: boolean;
    characterId?: string;
  };

  /**
   * Zar at
   */
  const rollDice = useCallback(async (
    diceType: DiceType,
    count: number = 1,
    modifier: number = 0,
    options: DiceRollOptions = {}
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{
        success: boolean;
        results: number[];
        total: number;
        roll?: {
          id: string;
          diceType: DiceType;
          count: number;
          results: number[];
          modifier: number;
          total: number;
          purpose?: string;
          timestamp: string;
        };
        message?: Message;
      }>(
        '/dice/roll',
        {
          sessionId,
          characterId: options.characterId,
          diceType,
          count,
          modifier,
          purpose: options.purpose,
          advantage: options.advantage === true,
          disadvantage: options.disadvantage === true,
        }
      );
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Zar atılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const rollCheck = useCallback(async (params: {
    diceType?: DiceType;
    modifier?: number;
    purpose?: string;
    ability?: string;
    skill?: string;
    dc?: number;
    advantage?: boolean;
    disadvantage?: boolean;
    characterId?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post('/dice/roll-check', {
        sessionId,
        ...params,
      });
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Kontrol zarı atılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const rollAttack = useCallback(async (params: {
    modifier?: number;
    purpose?: string;
    weaponName?: string;
    targetName?: string;
    advantage?: boolean;
    disadvantage?: boolean;
    characterId?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post('/dice/roll-attack', {
        sessionId,
        ...params,
      });
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Saldırı zarı atılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const rollDamage = useCallback(async (params: {
    diceType: DiceType;
    count?: number;
    modifier?: number;
    purpose?: string;
    weaponName?: string;
    targetName?: string;
    characterId?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post('/dice/roll-damage', {
        sessionId,
        ...params,
      });
      return data;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Hasar zarı atılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    isLoading,
    error,
    rollDice,
    rollCheck,
    rollAttack,
    rollDamage,
  };
}

/**
 * useCharacters Hook - Karakter yönetimi
 */
export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Kullanıcının karakterlerini getir
   */
  const fetchCharacters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await get<{ success: boolean; characters: Character[] }>('/characters');
      if (data?.characters) {
        setCharacters(data.characters);
        return data.characters;
      }
      return [];
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Karakterler yüklenemedi');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Yeni karakter oluştur
   */
  const createCharacter = useCallback(async (characterData: Partial<Character>) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{ success: boolean; character: Character }>('/characters', characterData);
      if (data?.character) {
        setCharacters((prev) => [...prev, data.character]);
        return data.character;
      }
      return null;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Karakter oluşturulamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Component mount olduğunda karakterleri getir
   */
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return {
    characters,
    isLoading,
    error,
    fetchCharacters,
    createCharacter,
  };
}

/**
 * useCampaigns Hook - Oturum yönetimi
 */
export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Kullanıcının oturumlarını getir
   */
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await get<{ success: boolean; campaigns: Campaign[] }>('/campaigns');
      if (data?.campaigns) {
        setCampaigns(data.campaigns);
        return data.campaigns;
      }
      return [];
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Oturumlar yüklenemedi');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Yeni oturum oluştur
   */
  const createCampaign = useCallback(async (campaignData: Partial<Campaign>) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await post<{ success: boolean; campaign: Campaign }>('/campaigns', campaignData);
      if (data?.campaign) {
        setCampaigns((prev) => [...prev, data.campaign]);
        return data.campaign;
      }
      return null;
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Oturum oluşturulamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Component mount olduğunda oturumları getir
   */
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
  };
}

/**
 * usePolling Hook - Otomatik polling
 */
export function usePolling(
  callback: () => void,
  interval: number = 3000,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(callback, interval);

    return () => clearInterval(intervalId);
  }, [callback, interval, enabled]);
}

/**
 * useMaps Hook - Session harita yönetimi
 */
export interface GameMap {
  id: string;
  sessionId: string;
  name?: string;
  description?: string;
  imageUrl: string;
  isAIGenerated: boolean;
  prompt?: string;
  createdAt: string;
}

export function useMaps(sessionId: string) {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Session haritalarını getir
   */
  const fetchMaps = useCallback(async () => {
    if (!sessionId) return [];

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/maps`);
      const data = await response.json();

      if (data.success) {
        setMaps(data.maps);
        return data.maps;
      } else {
        throw new Error(data.message || 'Haritalar yüklenemedi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Haritalar yüklenemedi');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Manuel harita ekle
   */
  const addMap = useCallback(async (mapData: { name: string; description?: string; imageUrl: string }) => {
    if (!sessionId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData),
      });
      const data = await response.json();

      if (data.success) {
        setMaps((prev) => [data.map, ...prev]);
        return data.map;
      } else {
        throw new Error(data.message || 'Harita eklenemedi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Harita eklenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * AI ile harita oluştur
   */
  const generateMap = useCallback(async (input: {
    locationName: string;
    locationType: string;
    atmosphere?: string;
    details?: string[];
  }) => {
    if (!sessionId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gm/generate-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...input,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMaps((prev) => [data.map, ...prev]);
        return data.map;
      } else {
        throw new Error(data.message || 'Harita oluşturulamadı');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Harita oluşturulamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Harita güncelle
   */
  const updateMap = useCallback(async (mapId: string, updateData: { name?: string; description?: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();

      if (data.success) {
        setMaps((prev) => prev.map((m) => (m.id === mapId ? data.map : m)));
        return data.map;
      } else {
        throw new Error(data.message || 'Harita güncellenemedi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Harita güncellenemedi');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Harita sil
   */
  const deleteMap = useCallback(async (mapId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
        return true;
      } else {
        throw new Error(data.message || 'Harita silinemedi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Harita silinemedi');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    maps,
    isLoading,
    error,
    fetchMaps,
    addMap,
    generateMap,
    updateMap,
    deleteMap,
  };
}
