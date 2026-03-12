"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/security/imageUrl";
import type { Message, GMAction } from "@/types";
import { Bot, User, Dice6, Swords, AlertCircle, RotateCcw, MoreVertical, RefreshCw, MapPin } from "lucide-react";
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
  const [expandedImage, setExpandedImage] = useState<{ url: string; name: string } | null>(null);
  const safeExpandedImageUrl = expandedImage ? normalizeImageUrl(expandedImage.url) : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // En son GM mesajını bul — sadece o mesajda gmPrompt varsa butonları göster
  // Böylece yeni bir GM yanıtı (prompt'suz) geldiğinde eski butonlar kaybolur
  const lastGMMessage = [...messages].reverse().find(m => m.senderType === 'GM');
  const lastGMMessageWithPrompt = 
    lastGMMessage?.gmPrompt?.actions && lastGMMessage.gmPrompt.actions.length > 0
      ? lastGMMessage 
      : null;

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
        const rawLocationImageUrl =
          typeof message.locationImageUrl === "string" ? message.locationImageUrl.trim() : "";
        const safeLocationImageUrl = normalizeImageUrl(rawLocationImageUrl || null);
        const hasLocationImageMetadata = rawLocationImageUrl.length > 0 || Boolean(message.locationName);
        const isImageSystemMessage = message.senderType === 'SYSTEM' && hasLocationImageMetadata;
        const senderType = isImageSystemMessage ? 'GM' : message.senderType;
        const config = senderConfig[senderType];
        const Icon = config.icon;
        const displaySenderName = isImageSystemMessage ? 'Game Master' : message.senderName;

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
                {displaySenderName && (
                  <p className="text-xs text-foreground-muted">
                    {displaySenderName}
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
              
              {/* Mekan Görseli - GM mesajlarında */}
              {hasLocationImageMetadata && (
                <div
                  className={cn(
                    "mt-2 rounded-lg overflow-hidden border border-border transition-opacity",
                    safeLocationImageUrl && "cursor-pointer hover:opacity-90"
                  )}
                  onClick={() => {
                    if (!safeLocationImageUrl) return;
                    setExpandedImage({ url: safeLocationImageUrl, name: message.locationName || 'Mekan Görseli' });
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-background-secondary border-b border-border">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {message.locationName || 'Mekan Görseli'}
                    </span>
                  </div>
                  {safeLocationImageUrl ? (
                    <div className="relative aspect-[16/9] w-full">
                      <img
                        src={safeLocationImageUrl}
                        alt={message.locationName || "Mekan görseli"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <p className="px-3 py-2 text-xs text-foreground-muted bg-background">
                      Görsel güvenlik nedeniyle gösterilemiyor.
                    </p>
                  )}
                </div>
              )}
              
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
      
      {/* Full Screen Image Modal */}
      {expandedImage && safeExpandedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={safeExpandedImageUrl}
              alt={expandedImage.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {expandedImage.name}
                </span>
              </div>
            </div>
            <button
              className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/70 hover:bg-black/90 text-white border border-white/20 rounded-lg flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(null);
              }}
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
