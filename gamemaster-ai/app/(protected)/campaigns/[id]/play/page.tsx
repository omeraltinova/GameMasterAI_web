"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ChatWindow, MessageInput, DiceRoller, CharacterMini } from "@/components/game";
import { mockCampaigns, mockCharacters, mockMessages as initialMessages } from "@/lib/mock-data";
import type { Message, DiceType } from "@/types";
import {
  ArrowLeft,
  Dice6,
  Backpack,
  Map,
  Users,
  Settings,
  X,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidePanelView = "character" | "dice" | "inventory" | null;

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isAITyping, setIsAITyping] = useState(false);
  const [sidePanelView, setSidePanelView] = useState<SidePanelView>("character");

  const campaign = mockCampaigns.find((c) => c.id === params.id);
  const character = mockCharacters[0]; // Mock: first character

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Kampanya bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Kampanyalara Dön</Button>
        </Link>
      </div>
    );
  }

  const handleSendMessage = (content: string) => {
    // Add player message
    const playerMessage: Message = {
      id: `msg_${Date.now()}`,
      sessionId: "sess_1",
      senderId: "user_1",
      senderType: "PLAYER",
      senderName: character.name,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, playerMessage]);

    // Simulate AI response
    setIsAITyping(true);
    setTimeout(() => {
      const gmMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        sessionId: "sess_1",
        senderType: "GM",
        senderName: "Game Master",
        content: generateAIResponse(content),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, gmMessage]);
      setIsAITyping(false);
    }, 1500);
  };

  const handleDiceRoll = (
    diceType: DiceType,
    count: number,
    modifier: number,
    results: number[]
  ) => {
    const total = results.reduce((a, b) => a + b, 0) + modifier;
    const diceMessage: Message = {
      id: `msg_${Date.now()}`,
      sessionId: "sess_1",
      senderType: "DICE",
      senderName: character.name,
      content: `🎲 ${count}${diceType}${
        modifier >= 0 ? `+${modifier}` : modifier
      } = [${results.join(", ")}]${modifier ? ` + ${modifier}` : ""} = **${total}**`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, diceMessage]);
  };

  const toggleSidePanel = (view: SidePanelView) => {
    setSidePanelView(sidePanelView === view ? null : view);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Game Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaign.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{campaign.name}</h1>
            <p className="text-xs text-foreground-muted">
              {character.name} ile oynuyorsun
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Aktif</Badge>
          <Link href={`/campaigns/${campaign.id}/settings`}>
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
          <ChatWindow messages={messages} />

          {/* Typing Indicator */}
          {isAITyping && (
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

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background">
            <MessageInput
              onSend={handleSendMessage}
              disabled={isAITyping}
              placeholder="Aksiyonunu yaz... (örn: 'Kapıyı açmaya çalışıyorum')"
            />

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("dice")}
                className={cn(
                  "gap-1",
                  sidePanelView === "dice" && "bg-primary/10 border-primary"
                )}
              >
                <Dice6 className="h-4 w-4" />
                Zar At
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("inventory")}
                className={cn(
                  "gap-1",
                  sidePanelView === "inventory" && "bg-primary/10 border-primary"
                )}
              >
                <Backpack className="h-4 w-4" />
                Envanter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSidePanel("character")}
                className={cn(
                  "gap-1",
                  sidePanelView === "character" && "bg-primary/10 border-primary"
                )}
              >
                <Users className="h-4 w-4" />
                Karakter
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {sidePanelView && (
          <aside className="w-80 border-l border-border bg-background-secondary overflow-y-auto animate-slide-up">
            <div className="p-4">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {sidePanelView === "character" && "Karakter"}
                  {sidePanelView === "dice" && "Zar At"}
                  {sidePanelView === "inventory" && "Envanter"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidePanelView(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Panel Content */}
              {sidePanelView === "character" && (
                <CharacterMini character={character} />
              )}

              {sidePanelView === "dice" && (
                <Card>
                  <CardContent className="p-4">
                    <DiceRoller onRoll={handleDiceRoll} />
                  </CardContent>
                </Card>
              )}

              {sidePanelView === "inventory" && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">Hızlı Erişim</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      {[
                        { name: "Battleaxe", type: "Weapon", equipped: true },
                        { name: "Healing Potion", type: "Potion", quantity: 2 },
                        { name: "Chain Mail", type: "Armor", equipped: true },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-background-elevated"
                        >
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-foreground-muted">
                              {item.type}
                            </p>
                          </div>
                          {item.equipped && (
                            <Badge variant="success" size="sm">
                              Kuşanılmış
                            </Badge>
                          )}
                          {item.quantity && (
                            <Badge variant="outline" size="sm">
                              x{item.quantity}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <Link href={`/characters/${character.id}/inventory`}>
                      <Button variant="ghost" size="sm" className="w-full mt-3">
                        Tam Envanteri Gör
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// Mock AI response generator
function generateAIResponse(playerAction: string): string {
  const responses = [
    `${playerAction} aksiyonunu dikkatle değerlendiriyorum. Mağaranın derinliklerinden gelen bir ses duyuyorsunuz - sanki metal metale sürtünüyor. İlerlemek ister misiniz, yoksa temkinli davranarak çevreyi inceleyecek misiniz?`,
    `Hamleniz başarılı! Eski taş kapı gıcırdayarak açılıyor ve önünüzde karanlık bir koridor beliriyor. Duvarlardan sızan ışık, yosun kaplı taşları aydınlatıyor. Koridor iki yöne ayrılıyor - sol taraftan hafif bir esinti geliyor, sağ taraftan ise sönük bir ışık görünüyor.`,
    `İlginç bir yaklaşım! Goblin bekçisi sizi fark etmedi. Ama dikkatli olun - arkasındaki gölgelerde hareket eden başka figürler var. Perception check yapmak ister misiniz?`,
    `Yaşlı büyücü gülümseyerek size bakıyor. "Cesur bir maceracı daha... Ama bu sefer farklı bir şey seziyorum sende. Söyle bana, neden bu tehlikeli yola çıktın?" NPC ile konuşmaya devam edebilir veya başka bir aksiyon alabilirsiniz.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}


