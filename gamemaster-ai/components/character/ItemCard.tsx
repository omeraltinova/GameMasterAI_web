"use client";

import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Shield, Swords, Trash2, Check, X } from "lucide-react";

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

interface InventoryItem {
    id: string;
    name: string;
    type: string;
    description?: string | null;
    quantity: number;
    weight: number;
    equipped: boolean;
    properties?: Record<string, any> | null;
}

interface ItemCardProps {
    item: InventoryItem;
    onEquip?: (itemId: string, equip: boolean) => void;
    onDelete?: (itemId: string) => void;
    onUpdate?: (itemId: string, data: Partial<InventoryItem>) => void;
    isLoading?: boolean;
    compact?: boolean;
}

export function ItemCard({
    item,
    onEquip,
    onDelete,
    onUpdate,
    isLoading,
    compact = false,
}: ItemCardProps) {
    const isEquippable = EQUIPPABLE_TYPES.includes(item.type);
    const emoji = TYPE_EMOJI[item.type] || '📦';

    // Parse properties if string
    const properties = typeof item.properties === 'string'
        ? JSON.parse(item.properties)
        : item.properties;

    if (compact) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-all",
                    item.equipped
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-background-elevated hover:bg-border/50"
                )}
            >
                <span className="text-lg">{emoji}</span>
                <span className="flex-1 truncate font-medium">{item.name}</span>
                {item.quantity > 1 && (
                    <Badge variant="secondary" size="sm">x{item.quantity}</Badge>
                )}
                {item.equipped && (
                    <Badge variant="primary" size="sm">Kuşanılmış</Badge>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "p-3 rounded-lg transition-all",
                item.equipped
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-background-elevated hover:bg-border/50"
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <span className="text-2xl">{emoji}</span>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        {item.quantity > 1 && (
                            <Badge variant="secondary" size="sm">x{item.quantity}</Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                        <span>{item.type}</span>
                        {item.weight > 0 && (
                            <>
                                <span>•</span>
                                <span>{item.weight} lb</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Equipped badge */}
                {item.equipped && (
                    <Badge variant="primary" size="sm" className="flex-shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        Kuşanılmış
                    </Badge>
                )}
            </div>

            {/* Description */}
            {item.description && (
                <p className="text-sm text-foreground-secondary mt-2 line-clamp-2">
                    {item.description}
                </p>
            )}

            {/* Properties */}
            {properties && Object.keys(properties).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {properties.damage && (
                        <Badge variant="danger" size="sm" className="gap-1">
                            <Swords className="h-3 w-3" />
                            {properties.damage}
                        </Badge>
                    )}
                    {properties.armorClass && (
                        <Badge variant="primary" size="sm" className="gap-1">
                            <Shield className="h-3 w-3" />
                            AC +{properties.armorClass}
                        </Badge>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
                {isEquippable && onEquip && (
                    <Button
                        variant={item.equipped ? "outline" : "primary"}
                        size="sm"
                        onClick={() => onEquip(item.id, !item.equipped)}
                        disabled={isLoading}
                        className="flex-1 gap-1"
                    >
                        {item.equipped ? (
                            <>
                                <X className="h-3 w-3" />
                                Çıkar
                            </>
                        ) : (
                            <>
                                <Check className="h-3 w-3" />
                                Kuşan
                            </>
                        )}
                    </Button>
                )}

                {onDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                        disabled={isLoading}
                        className="text-danger hover:text-danger"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
