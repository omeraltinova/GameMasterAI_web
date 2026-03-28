"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeConfig, type ThemeColor } from "@/components/providers/ThemeProvider";

interface ThemeSelectorProps {
  variant?: "dropdown" | "inline";
  className?: string;
}

export function ThemeSelector({ variant = "dropdown", className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration uyumsuzluğunu önlemek için
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = Object.entries(themeConfig) as [ThemeColor, typeof themeConfig[ThemeColor]][];

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Palette className="h-4 w-4 text-foreground-muted" />
        <div className="flex gap-1">
          {themes.map(([key, config]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all duration-200",
                theme === key
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105 hover:border-border-hover"
              )}
              style={{ backgroundColor: config.color }}
              title={config.label}
            />
          ))}
        </div>
      </div>
    );
  }

  // Dropdown variant - for use in menus
  return (
    <div className={cn("py-1", className)}>
      {themes.map(([key, config]) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md transition-colors",
            "hover:bg-background-elevated",
            theme === key && "bg-background-elevated"
          )}
        >
          <span
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: config.color }}
          />
          <span className="flex-1 text-left text-foreground">{config.label}</span>
          {theme === key && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
