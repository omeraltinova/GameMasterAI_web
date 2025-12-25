"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { Bot, User, Dice6, Swords, AlertCircle } from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
}

const senderConfig = {
  GM: {
    icon: Bot,
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    iconColor: "text-primary",
    align: "left" as const,
  },
  PLAYER: {
    icon: User,
    bgColor: "bg-secondary/10",
    borderColor: "border-secondary/30",
    iconColor: "text-secondary",
    align: "right" as const,
  },
  SYSTEM: {
    icon: AlertCircle,
    bgColor: "bg-background-elevated",
    borderColor: "border-border",
    iconColor: "text-foreground-muted",
    align: "center" as const,
  },
  DICE: {
    icon: Dice6,
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    iconColor: "text-warning",
    align: "center" as const,
  },
  COMBAT: {
    icon: Swords,
    bgColor: "bg-danger/10",
    borderColor: "border-danger/30",
    iconColor: "text-danger",
    align: "center" as const,
  },
};

export function ChatWindow({ messages }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message, index) => {
        const config = senderConfig[message.senderType];
        const Icon = config.icon;

        if (config.align === "center") {
          return (
            <div
              key={message.id || index}
              className="flex justify-center animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg border",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn("h-4 w-4", config.iconColor)} />
                <span className="text-sm">{message.content}</span>
              </div>
            </div>
          );
        }

        const isRight = config.align === "right";

        return (
          <div
            key={message.id || index}
            className={cn(
              "flex gap-3 animate-slide-up",
              isRight && "flex-row-reverse"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                config.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4", config.iconColor)} />
            </div>

            {/* Message Bubble */}
            <div className={cn("max-w-[75%]", isRight && "text-right")}>
              {message.senderName && (
                <p
                  className={cn(
                    "text-xs text-foreground-muted mb-1",
                    isRight && "text-right"
                  )}
                >
                  {message.senderName}
                </p>
              )}
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
              <p
                className={cn(
                  "text-xs text-foreground-muted mt-1",
                  isRight && "text-right"
                )}
              >
                {new Date(message.timestamp).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


