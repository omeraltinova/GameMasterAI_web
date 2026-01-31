"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal, Textarea, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { 
    Trash2, 
    Check, 
    X, 
    Edit2, 
    Save,
    Shield,
    Swords,
    Weight,
    Package,
    Sparkles
} from "lucide-react";
import type { InventoryItem } from "@/types";

// Item tipi emojileri
const TYPE_EMOJI: Record<string, string> = {
    Weapon: '⚔️',
    Armor: '🛡️',
    Shield: '🛡️',
    Helmet: '🪖',
    Boots: '👢',
    Gloves: '🧤',
    Cloak: '🧥',
    Ring: '💍',
    Amulet: '📿',
    Accessory: '🎀',
    Potion: '🧪',
    Scroll: '📜',
    Tool: '🔧',
    Consumable: '🍖',
    Treasure: '💎',
    Misc: '📦',
};

// Kuşanılabilir tipler
const EQUIPPABLE_TYPES = ['Weapon', 'Armor', 'Shield', 'Accessory', 'Ring', 'Amulet', 'Helmet', 'Boots', 'Gloves', 'Cloak'];

interface ItemDetailModalProps {
    item: InventoryItem | null;
    isOpen: boolean;
    onClose: () => void;
    onEquip?: (itemId: string, equip: boolean) => Promise<void>;
    onUpdate?: (itemId: string, data: Partial<InventoryItem>) => Promise<void>;
    onDelete?: (itemId: string) => Promise<void>;
    editable?: boolean;
}

export function ItemDetailModal({
    item,
    isOpen,
    onClose,
    onEquip,
    onUpdate,
    onDelete,
    editable = true,
}: ItemDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editData, setEditData] = useState({
        name: "",
        description: "",
        quantity: 1,
    });
    
    // Item değiştiğinde edit data'yı güncelle
    useEffect(() => {
        if (item) {
            setEditData({
                name: item.name,
                description: item.description || "",
                quantity: item.quantity,
            });
        }
        setIsEditing(false);
    }, [item]);
    
    if (!item) return null;
    
    const emoji = TYPE_EMOJI[item.type] || '📦';
    const isEquippable = EQUIPPABLE_TYPES.includes(item.type);
    
    // Parse properties if string
    const properties = typeof item.properties === 'string'
        ? JSON.parse(item.properties)
        : item.properties;
    
    const handleEquipToggle = async () => {
        if (!onEquip) return;
        setIsLoading(true);
        try {
            await onEquip(item.id, !item.equipped);
            onClose();
        } catch (error) {
            console.error("Equip error:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = async () => {
        if (!onUpdate) return;
        setIsLoading(true);
        try {
            await onUpdate(item.id, {
                name: editData.name.trim(),
                description: editData.description.trim() || null,
                quantity: editData.quantity,
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Update error:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm(`"${item.name}" item'ını silmek istediğinize emin misiniz?`)) return;
        
        setIsLoading(true);
        try {
            await onDelete(item.id);
            onClose();
        } catch (error) {
            console.error("Delete error:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal 
            open={isOpen} 
            onOpenChange={(open) => !open && onClose()} 
            title={isEditing ? "Item Düzenle" : item.name}
        >
            <div className="space-y-4">
                {/* Custom Header */}
                <div className="flex items-center gap-3 -mt-2">
                    <span className="text-3xl">{emoji}</span>
                    <div className="flex-1">
                        {isEditing ? (
                            <Input
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                placeholder="Item adı"
                                autoFocus
                            />
                        ) : (
                            <h3 className="text-xl font-bold">{item.name}</h3>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-foreground-muted">{item.type}</span>
                            {item.equipped && (
                                <Badge variant="primary" size="sm">Kuşanılmış</Badge>
                            )}
                        </div>
                    </div>
                </div>
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-background-elevated">
                    <div>
                        <p className="text-xs text-foreground-muted">Tip</p>
                        <p className="font-medium flex items-center gap-1">
                            <Package className="h-4 w-4 text-primary" />
                            {item.type}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-foreground-muted">Ağırlık</p>
                        <p className="font-medium flex items-center gap-1">
                            <Weight className="h-4 w-4 text-foreground-muted" />
                            {item.weight} lb
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-foreground-muted">Adet</p>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditData({ 
                                        ...editData, 
                                        quantity: Math.max(1, editData.quantity - 1) 
                                    })}
                                    className="p-1 rounded bg-border hover:bg-foreground-muted/20"
                                >
                                    -
                                </button>
                                <span className="font-bold w-8 text-center">{editData.quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setEditData({ 
                                        ...editData, 
                                        quantity: editData.quantity + 1 
                                    })}
                                    className="p-1 rounded bg-border hover:bg-foreground-muted/20"
                                >
                                    +
                                </button>
                            </div>
                        ) : (
                            <p className="font-medium">{item.quantity}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-foreground-muted">Durum</p>
                        <p className={cn(
                            "font-medium",
                            item.equipped ? "text-primary" : "text-foreground-secondary"
                        )}>
                            {item.equipped ? "Kuşanılmış" : "Çantada"}
                        </p>
                    </div>
                </div>
                
                {/* Özellikler */}
                {properties && Object.keys(properties).length > 0 && (
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                        <p className="text-xs text-foreground-muted mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Özellikler
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {properties.damage && (
                                <Badge variant="danger" className="gap-1">
                                    <Swords className="h-3 w-3" />
                                    Hasar: {properties.damage}
                                </Badge>
                            )}
                            {properties.armorClass && (
                                <Badge variant="primary" className="gap-1">
                                    <Shield className="h-3 w-3" />
                                    AC +{properties.armorClass}
                                </Badge>
                            )}
                            {properties.healing && (
                                <Badge variant="success" className="gap-1">
                                    ❤️ İyileşme: {properties.healing}
                                </Badge>
                            )}
                            {properties.effect && (
                                <Badge variant="secondary" className="gap-1">
                                    ✨ {properties.effect}
                                </Badge>
                            )}
                            {/* Diğer özellikler */}
                            {Object.entries(properties)
                                .filter(([key]) => !['damage', 'armorClass', 'healing', 'effect'].includes(key))
                                .map(([key, value]) => (
                                    <Badge key={key} variant="outline">
                                        {key}: {String(value)}
                                    </Badge>
                                ))
                            }
                        </div>
                    </div>
                )}
                
                {/* Açıklama */}
                <div>
                    <p className="text-xs text-foreground-muted mb-1">Açıklama</p>
                    {isEditing ? (
                        <Textarea
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="Item hakkında açıklama..."
                            rows={3}
                        />
                    ) : (
                        <p className="text-foreground-secondary text-sm">
                            {item.description || "Açıklama yok"}
                        </p>
                    )}
                </div>
                
                {/* Aksiyon Butonları */}
                {editable && (
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                        {/* Kuşan/Çıkar */}
                        {isEquippable && onEquip && (
                            <Button
                                variant={item.equipped ? "outline" : "primary"}
                                onClick={handleEquipToggle}
                                disabled={isLoading}
                                className="gap-2"
                            >
                                {item.equipped ? (
                                    <>
                                        <X className="h-4 w-4" />
                                        Çıkar
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Kuşan
                                    </>
                                )}
                            </Button>
                        )}
                        
                        {/* Düzenle/Kaydet */}
                        {onUpdate && (
                            isEditing ? (
                                <Button
                                    variant="secondary"
                                    onClick={handleSave}
                                    disabled={isLoading || !editData.name.trim()}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Kaydet
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(true)}
                                    disabled={isLoading}
                                    className="gap-2"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Düzenle
                                </Button>
                            )
                        )}
                        
                        {/* İptal (düzenleme modunda) */}
                        {isEditing && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditData({
                                        name: item.name,
                                        description: item.description || "",
                                        quantity: item.quantity,
                                    });
                                }}
                                disabled={isLoading}
                            >
                                İptal
                            </Button>
                        )}
                        
                        {/* Spacer */}
                        <div className="flex-1" />
                        
                        {/* Sil */}
                        {onDelete && !isEditing && (
                            <Button
                                variant="ghost"
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="text-danger hover:text-danger hover:bg-danger/10 gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Sil
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
