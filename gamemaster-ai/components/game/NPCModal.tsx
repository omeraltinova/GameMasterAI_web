"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Users, Swords, Heart, RefreshCw, MessageCircle, X, Trash2 } from "lucide-react";

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
    canManage?: boolean;
    onTalkToNPC?: (npc: NPC) => void;
}

export function NPCModal({ isOpen, onClose, sessionId, canManage = false, onTalkToNPC }: NPCModalProps) {
    const [npcs, setNpcs] = useState<NPC[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editPersonality, setEditPersonality] = useState("");
    const [editAttitude, setEditAttitude] = useState<"friendly" | "hostile">("friendly");

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
        } catch {
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

    useEffect(() => {
        if (!isOpen) {
            setSelectedNPC(null);
            setDetailError(null);
            setIsDetailLoading(false);
            setIsDeleting(false);
            setIsEditing(false);
            setIsSaving(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedNPC) return;
        setEditPersonality(selectedNPC.personality || "");
        setEditAttitude(selectedNPC.isHostile ? "hostile" : "friendly");
    }, [selectedNPC]);

    const handleTalkTo = (npc: NPC) => {
        onTalkToNPC?.(npc);
        onClose();
    };

    const openNPCDetail = useCallback(async (npc: NPC) => {
        setSelectedNPC(npc);
        setDetailError(null);
        setIsDetailLoading(true);
        try {
            const response = await fetch(`/api/sessions/${sessionId}/npcs/${npc.id}`);
            const data = await response.json();

            if (data.success && data.npc) {
                setSelectedNPC(data.npc);
            } else {
                setDetailError(data.error || "NPC detayı yüklenemedi");
            }
        } catch {
            setDetailError("NPC detayı yüklenirken hata oluştu");
        } finally {
            setIsDetailLoading(false);
        }
    }, [sessionId]);

    const handleDeleteNPC = useCallback(async (npcId: string) => {
        if (!canManage) return;
        setIsDeleting(true);
        setDetailError(null);
        try {
            const response = await fetch(`/api/sessions/${sessionId}/npcs/${npcId}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (data.success) {
                setNpcs((prev) => prev.filter((npc) => npc.id !== npcId));
                setSelectedNPC(null);
            } else {
                setDetailError(data.error || "NPC silinemedi");
            }
        } catch {
            setDetailError("NPC silinirken hata oluştu");
        } finally {
            setIsDeleting(false);
        }
    }, [canManage, sessionId]);

    const handleSaveNPC = useCallback(async () => {
        if (!canManage || !selectedNPC) return;
        setIsSaving(true);
        setDetailError(null);
        try {
            const response = await fetch(`/api/sessions/${sessionId}/npcs/${selectedNPC.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    personality: editPersonality.trim() || null,
                    isHostile: editAttitude === "hostile",
                }),
            });
            const data = await response.json();

            if (data.success && data.npc) {
                setSelectedNPC(data.npc);
                setNpcs((prev) => prev.map((npc) => (npc.id === data.npc.id ? data.npc : npc)));
                setIsEditing(false);
            } else {
                setDetailError(data.error || "NPC güncellenemedi");
            }
        } catch {
            setDetailError("NPC güncellenirken hata oluştu");
        } finally {
            setIsSaving(false);
        }
    }, [canManage, editAttitude, editPersonality, selectedNPC, sessionId]);

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
                                            onSelect={() => void openNPCDetail(npc)}
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
                                            onSelect={() => void openNPCDetail(npc)}
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
            {isOpen && selectedNPC && (
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

                        {isDetailLoading ? (
                            <div className="py-8 flex justify-center">
                                <RefreshCw className="h-6 w-6 animate-spin text-foreground-muted" />
                            </div>
                        ) : (
                            <>
                                {isEditing ? (
                                    <div className="space-y-3 mb-4">
                                        <div>
                                            <label className="text-xs text-foreground-muted mb-1 block">Kişilik</label>
                                            <textarea
                                                value={editPersonality}
                                                onChange={(e) => setEditPersonality(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-lg border border-border bg-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder="Örn: Kurnaz, mesafeli, temkinli..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-foreground-muted mb-1 block">Tutum</label>
                                            <select
                                                value={editAttitude}
                                                onChange={(e) => setEditAttitude(e.target.value as "friendly" | "hostile")}
                                                className="w-full rounded-lg border border-border bg-input p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="friendly">Dostça</option>
                                                <option value="hostile">Düşmanca</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {selectedNPC.personality && (
                                            <p className="text-sm text-foreground-secondary mb-4 italic">
                                                &ldquo;{selectedNPC.personality}&rdquo;
                                            </p>
                                        )}
                                        <p className="text-xs text-foreground-muted mb-4">
                                            Tutum: {selectedNPC.isHostile ? "Düşmanca" : "Dostça"}
                                        </p>
                                    </>
                                )}

                                {selectedNPC.dialogue && selectedNPC.dialogue.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium mb-2">Önemli Sözleri:</h4>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {selectedNPC.dialogue.slice(-3).map((d, i) => (
                                                <p key={i} className="text-xs text-foreground-muted bg-background-elevated p-2 rounded">
                                                    &ldquo;{d.text}&rdquo;
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {detailError && (
                            <p className="text-xs text-danger mb-3">{detailError}</p>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                className="flex-1 gap-2"
                                disabled={isDetailLoading || isDeleting || isSaving}
                                onClick={() => {
                                    handleTalkTo(selectedNPC);
                                    setSelectedNPC(null);
                                }}
                            >
                                <MessageCircle className="h-4 w-4" />
                                Konuş
                            </Button>
                            {canManage && (
                                isEditing ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            disabled={isSaving || isDeleting}
                                            onClick={() => {
                                                setIsEditing(false);
                                                setEditPersonality(selectedNPC.personality || "");
                                                setEditAttitude(selectedNPC.isHostile ? "hostile" : "friendly");
                                            }}
                                        >
                                            Vazgeç
                                        </Button>
                                        <Button
                                            variant="primary"
                                            disabled={isSaving || isDeleting}
                                            onClick={() => void handleSaveNPC()}
                                        >
                                            {isSaving ? "Kaydediliyor" : "Kaydet"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            disabled={isDetailLoading || isDeleting}
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Düzenle
                                        </Button>
                                        <Button
                                            variant="danger"
                                            className="gap-2"
                                            disabled={isDetailLoading || isDeleting}
                                            onClick={() => void handleDeleteNPC(selectedNPC.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {isDeleting ? "Siliniyor" : "Sil"}
                                        </Button>
                                    </>
                                )
                            )}
                            <Button
                                variant="outline"
                                disabled={isDeleting || isSaving}
                                onClick={() => setSelectedNPC(null)}
                            >
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
