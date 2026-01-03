"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Message, GMAction } from "@/types";
import { Bot, User, Dice6, Swords, AlertCircle, RotateCcw, MoreVertical, RefreshCw } from "lucide-react";
import { ActionButtons } from "./ActionButtons";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui";

interface ChatWindowProps {
  messages: Message[];
  onActionSelect?: (action: GMAction, messageId: string) => void;
  onDiceRoll?: (action: GMAction, messageId: string) => void;
  onRestartFromMessage?: (messageId: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  isActionLoading?: boolean;
  disableActions?: boolean;
  canRestart?: boolean; // Sadece creator için göster
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

export function ChatWindow({ 
  messages, 
  onActionSelect, 
  onDiceRoll,
  onRestartFromMessage,
  onRegenerateMessage,
  isActionLoading = false,
  disableActions = false,
  canRestart = false,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // En son GM mesajını bul (aksiyon butonları için)
  const lastGMMessageWithPrompt = [...messages].reverse().find(
    m => m.senderType === 'GM' && m.gmPrompt && m.gmPrompt.actions && m.gmPrompt.actions.length > 0
  );

  // Empty state
  if (!messages || messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex items-center justify-center"
      >
        <div className="text-center text-foreground-muted">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">Maceraya Hoş Geldin!</h3>
          <p className="text-sm">
            Aksiyonunu yazarak hikayeye başla.
          </p>
        </div>
      </div>
    );
  }

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

        // İlk mesaj değilse restart göster (en az 1 mesaj olmalı)
        const showRestartOption = canRestart && onRestartFromMessage && index > 0;
        
        // GM mesajları için regenerate seçeneği
        const showRegenerateOption = canRestart && onRegenerateMessage && message.senderType === 'GM' && index > 0;
        
        // En az bir seçenek varsa dropdown göster
        const showDropdown = showRestartOption || showRegenerateOption;

        return (
          <div
            key={message.id || index}
            className={cn(
              "flex gap-3 animate-slide-up group relative",
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
              <div className={cn(
                "flex items-center gap-2 mb-1",
                isRight && "flex-row-reverse"
              )}>
                {message.senderName && (
                  <p className="text-xs text-foreground-muted">
                    {message.senderName}
                  </p>
                )}
                
                {/* Options Dropdown - Hover'da görünür */}
                {showDropdown && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1 rounded hover:bg-background-elevated transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-auto"
                        title="Seçenekler"
                      >
                        <MoreVertical className="h-3 w-3 text-foreground-muted" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRight ? "end" : "start"}>
                      {showRegenerateOption && (
                        <DropdownMenuItem 
                          onClick={() => onRegenerateMessage!(message.id)}
                          className="gap-2 text-primary"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Mesajı Yeniden Üret
                        </DropdownMenuItem>
                      )}
                      {showRestartOption && (
                        <DropdownMenuItem 
                          onClick={() => onRestartFromMessage!(message.id)}
                          className="gap-2 text-warning"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Buradan Yeniden Başlat
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
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
              
              {/* GM Aksiyon Butonları - Sadece son GM mesajında ve gmPrompt varsa göster */}
              {message.id === lastGMMessageWithPrompt?.id && 
               message.gmPrompt && 
               onActionSelect && (
                <ActionButtons
                  gmPrompt={message.gmPrompt}
                  onActionSelect={(action) => onActionSelect(action, message.id)}
                  onDiceRoll={onDiceRoll ? (action) => onDiceRoll(action, message.id) : undefined}
                  isLoading={isActionLoading}
                  disabled={disableActions}
                />
              )}
              
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
      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}


