"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Users, Swords, Heart, RefreshCw, MessageCircle, X } from "lucide-react";

interface NPC {
    id: string;
    name: string;
    race?: string;
    role: string;
    personality?: string;
    isHostile: boolean;
    imageUrl?: string;
    stats?: {
        hp?: number;
        ac?: number;
    };
    dialogue?: Array<{ text: string; timestamp: string }>;
    createdAt: string;
}

interface NPCModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onTalkToNPC?: (npc: NPC) => void;
}

export function NPCModal({ isOpen, onClose, sessionId, onTalkToNPC }: NPCModalProps) {
    const [npcs, setNpcs] = useState<NPC[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);

    const fetchNPCs = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/sessions/${sessionId}/npcs`);
            const data = await response.json();

            if (data.success) {
                setNpcs(data.npcs);
                setError(null);
            } else {
                setError(data.error || 'NPC listesi yüklenemedi');
            }
        } catch (err) {
            setError('NPC listesi yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (isOpen) {
            fetchNPCs();
        }
    }, [isOpen, fetchNPCs]);

    const handleTalkTo = (npc: NPC) => {
        onTalkToNPC?.(npc);
        onClose();
    };

    // Group NPCs by hostility
    const friendlyNPCs = npcs.filter(npc => !npc.isHostile);
    const hostileNPCs = npcs.filter(npc => npc.isHostile);

    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title="🎭 Tanıştığın Karakterler"
            size="lg"
        >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-foreground-muted" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-danger mb-4">{error}</p>
                        <Button variant="outline" onClick={fetchNPCs} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Tekrar Dene
                        </Button>
                    </div>
                ) : npcs.length === 0 ? (
                    <div className="text-center py-8 text-foreground-muted">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Henüz kimseyle tanışmadın</p>
                        <p className="text-sm mt-2">Maceran ilerledikçe tanıştığın karakterler burada görünecek</p>
                    </div>
                ) : (
                    <>
                        {/* Friendly NPCs */}
                        {friendlyNPCs.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-success" />
                                    Dostlar ({friendlyNPCs.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {friendlyNPCs.map((npc) => (
                                        <NPCCard
                                            key={npc.id}
                                            npc={npc}
                                            onSelect={() => setSelectedNPC(npc)}
                                            onTalkTo={() => handleTalkTo(npc)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hostile NPCs */}
                        {hostileNPCs.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                                    <Swords className="h-4 w-4 text-danger" />
                                    Düşmanlar ({hostileNPCs.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {hostileNPCs.map((npc) => (
                                        <NPCCard
                                            key={npc.id}
                                            npc={npc}
                                            onSelect={() => setSelectedNPC(npc)}
                                            onTalkTo={() => handleTalkTo(npc)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* NPC Detail Drawer */}
            {selectedNPC && (
                <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center animate-fade-in">
                    <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-slide-up">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{selectedNPC.name}</h3>
                                <p className="text-sm text-foreground-muted">
                                    {selectedNPC.race && `${selectedNPC.race} • `}{selectedNPC.role}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedNPC(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {selectedNPC.personality && (
                            <p className="text-sm text-foreground-secondary mb-4 italic">
                                "{selectedNPC.personality}"
                            </p>
                        )}

                        {selectedNPC.dialogue && selectedNPC.dialogue.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">Önemli Sözleri:</h4>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {selectedNPC.dialogue.slice(-3).map((d, i) => (
                                        <p key={i} className="text-xs text-foreground-muted bg-background-elevated p-2 rounded">
                                            "{d.text}"
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                className="flex-1 gap-2"
                                onClick={() => {
                                    handleTalkTo(selectedNPC);
                                    setSelectedNPC(null);
                                }}
                            >
                                <MessageCircle className="h-4 w-4" />
                                Konuş
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedNPC(null)}>
                                Kapat
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// Individual NPC Card
function NPCCard({
    npc,
    onSelect,
    onTalkTo,
}: {
    npc: NPC;
    onSelect: () => void;
    onTalkTo: () => void;
}) {
    return (
        <div
            className={cn(
                "p-3 rounded-lg transition-all cursor-pointer hover:scale-[1.02]",
                npc.isHostile
                    ? "bg-danger/10 border border-danger/30 hover:bg-danger/20"
                    : "bg-background-elevated hover:bg-border/50"
            )}
            onClick={onSelect}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                        npc.isHostile
                            ? "bg-danger/20 text-danger"
                            : "bg-primary/20 text-primary"
                    )}
                >
                    {npc.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{npc.name}</h4>
                        {npc.isHostile && (
                            <Badge variant="danger" size="sm">Düşman</Badge>
                        )}
                    </div>
                    <p className="text-xs text-foreground-muted truncate">
                        {npc.race && `${npc.race} • `}{npc.role}
                    </p>
                    {npc.personality && (
                        <p className="text-xs text-foreground-secondary mt-1 line-clamp-1 italic">
                            {npc.personality}
                        </p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTalkTo();
                    }}
                >
                    <MessageCircle className="h-3 w-3" />
                    Konuş
                </Button>
            </div>
        </div>
    );
}
