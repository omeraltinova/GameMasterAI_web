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
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  session: null,
  gameState: null,
  messages: [],
  setSession: (session) => set({ session }),
  setGameState: (gameState) => set({ gameState }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  addMessages: (messages) =>
    set((state) => ({ messages: [...state.messages, ...messages] })),
  reset: () => set({ session: null, gameState: null, messages: [] }),
}));
