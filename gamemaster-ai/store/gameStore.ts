import { create } from "zustand";
import type { GameSession, GameState, Message } from "@/types";

interface GameStoreState {
  session: GameSession | null;
  gameState: GameState | null;
  messages: Message[];
  setSession: (session: GameSession | null) => void;
  setGameState: (state: GameState | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  reset: () => void;
}

// Mesajları timestamp'e göre sırala
function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });
}

export const useGameStore = create<GameStoreState>((set) => ({
  session: null,
  gameState: null,
  messages: [],
  setSession: (session) => set({ session }),
  setGameState: (gameState) => set({ gameState }),
  setMessages: (messages) => set({ messages: sortMessagesByTimestamp(messages) }),
  addMessage: (message) =>
    set((state) => {
      // Duplicate kontrolü - aynı ID varsa ekleme
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      // Yeni mesajı ekle ve sırala
      return { messages: sortMessagesByTimestamp([...state.messages, message]) };
    }),
  addMessages: (newMessages) =>
    set((state) => {
      // Duplicate kontrolü - sadece yeni mesajları ekle
      const existingIds = new Set(state.messages.map((m) => m.id));
      const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id));
      
      if (uniqueNewMessages.length === 0) {
        return state;
      }
      
      // Yeni mesajları ekle ve sırala
      return { messages: sortMessagesByTimestamp([...state.messages, ...uniqueNewMessages]) };
    }),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  reset: () => set({ session: null, gameState: null, messages: [] }),
}));
