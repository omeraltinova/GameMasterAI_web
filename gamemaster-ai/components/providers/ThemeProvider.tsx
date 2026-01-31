"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export type ThemeColor = "arcane" | "ocean" | "mystic";

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
} as const;

export const themes = Object.keys(themeConfig) as ThemeColor[];

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="arcane"
      themes={themes}
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="gamemaster-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
