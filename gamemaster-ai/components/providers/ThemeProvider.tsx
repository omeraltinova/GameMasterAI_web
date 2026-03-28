"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export type ThemeColor = "arcane" | "ocean" | "mystic" | "ember" | "shadow" | "verdant";

export const themeConfig = {
  arcane: {
    label: "Arcane",
    description: "Pembe ve mor tonları",
    color: "#ff4d94",
  },
  ocean: {
    label: "Ocean", 
    description: "Mavi ve cyan tonları",
    color: "#3b82f6",
  },
  mystic: {
    label: "Mystic",
    description: "Mor ve fuşya tonları", 
    color: "#8b5cf6",
  },
  ember: {
    label: "Ember",
    description: "Ateş ve ejderha tonları",
    color: "#f97316",
  },
  shadow: {
    label: "Shadow",
    description: "Gece ve gölge tonları",
    color: "#94a3b8",
  },
  verdant: {
    label: "Verdant",
    description: "Orman ve doğa tonları",
    color: "#10b981",
  },
} as const;

export const themes = Object.keys(themeConfig) as ThemeColor[];

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="shadow"
      themes={themes}
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="gamemaster-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
