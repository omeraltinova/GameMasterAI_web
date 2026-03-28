"use client";

import { cn } from "@/lib/utils";
import { 
    Sword, 
    Shield, 
    Shirt, 
    HardHat, 
    Footprints, 
    Hand, 
    Circle,
    Gem,
    Sparkles
} from "lucide-react";
import type { InventoryItem } from "@/types";

// Slot tanımları
const EQUIPMENT_SLOTS = {
    head: { label: "Baş", icon: HardHat, acceptTypes: ["Helmet"] },
    body: { label: "Gövde", icon: Shirt, acceptTypes: ["Armor"] },
    mainHand: { label: "Ana El", icon: Sword, acceptTypes: ["Weapon"] },
    offHand: { label: "Yan El", icon: Shield, acceptTypes: ["Shield", "Weapon"] },
    hands: { label: "Eller", icon: Hand, acceptTypes: ["Gloves"] },
    feet: { label: "Ayaklar", icon: Footprints, acceptTypes: ["Boots"] },
    cloak: { label: "Pelerin", icon: Sparkles, acceptTypes: ["Cloak"] },
    ring1: { label: "Yüzük 1", icon: Circle, acceptTypes: ["Ring"] },
    ring2: { label: "Yüzük 2", icon: Circle, acceptTypes: ["Ring"] },
    amulet: { label: "Muska", icon: Gem, acceptTypes: ["Amulet", "Accessory"] },
} as const;

type SlotType = keyof typeof EQUIPMENT_SLOTS;

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
};

interface EquipmentSlotsProps {
    equippedItems: InventoryItem[];
    onSlotClick?: (slot: SlotType, item: InventoryItem | null) => void;
    onUnequip?: (itemId: string) => void;
    compact?: boolean;
    className?: string;
}

// Item tipine göre slot bul
function getSlotForItemType(type: string, equippedItems: InventoryItem[]): SlotType | null {
    for (const [slot, config] of Object.entries(EQUIPMENT_SLOTS)) {
        if (config.acceptTypes.includes(type as never)) {
            // Ring için özel kontrol - iki slot var
            if (type === "Ring") {
                const ring1Equipped = equippedItems.some(
                    item => item.type === "Ring" && getItemSlot(item, equippedItems) === "ring1"
                );
                if (!ring1Equipped) return "ring1";
                return "ring2";
            }
            return slot as SlotType;
        }
    }
    return null;
}

// Item'ın hangi slotta olduğunu bul
function getItemSlot(item: InventoryItem, allEquipped: InventoryItem[]): SlotType | null {
    const type = item.type;
    
    for (const [slot, config] of Object.entries(EQUIPMENT_SLOTS)) {
        if (config.acceptTypes.includes(type as never)) {
            // Ring için sıralama
            if (type === "Ring") {
                const rings = allEquipped.filter(i => i.type === "Ring");
                const ringIndex = rings.findIndex(r => r.id === item.id);
                return ringIndex === 0 ? "ring1" : "ring2";
            }
            return slot as SlotType;
        }
    }
    return null;
}

// Slot'a göre item bul
function getItemForSlot(slot: SlotType, equippedItems: InventoryItem[]): InventoryItem | null {
    const config = EQUIPMENT_SLOTS[slot];
    const matchingItems = equippedItems.filter(item => 
        config.acceptTypes.includes(item.type as never)
    );
    
    if (slot === "ring1") {
        return matchingItems.find(item => item.type === "Ring") || null;
    }
    if (slot === "ring2") {
        const rings = matchingItems.filter(item => item.type === "Ring");
        return rings.length > 1 ? rings[1] : null;
    }
    
    return matchingItems[0] || null;
}

interface SlotProps {
    slot: SlotType;
    item: InventoryItem | null;
    onClick?: () => void;
    compact?: boolean;
}

function EquipmentSlot({ slot, item, onClick, compact }: SlotProps) {
    const config = EQUIPMENT_SLOTS[slot];
    const Icon = config.icon;
    const emoji = item ? TYPE_EMOJI[item.type] || '📦' : null;
    
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all",
                compact ? "w-12 h-12" : "w-16 h-16",
                item 
                    ? "border-primary bg-primary/10 hover:bg-primary/20" 
                    : "border-border/50 bg-background-elevated/50 hover:border-foreground-muted hover:bg-background-elevated",
                onClick && "cursor-pointer"
            )}
            title={item ? `${config.label}: ${item.name}` : `${config.label} (Boş)`}
        >
            {item ? (
                <>
                    <span className={cn("text-xl", compact && "text-lg")}>{emoji}</span>
                    {!compact && (
                        <span className="text-[10px] text-foreground-muted mt-0.5 truncate max-w-full px-1">
                            {item.name.length > 8 ? item.name.slice(0, 8) + '...' : item.name}
                        </span>
                    )}
                </>
            ) : (
                <>
                    <Icon className={cn(
                        "text-foreground-muted/40",
                        compact ? "h-4 w-4" : "h-5 w-5"
                    )} />
                    {!compact && (
                        <span className="text-[9px] text-foreground-muted/60 mt-0.5">
                            {config.label}
                        </span>
                    )}
                </>
            )}
        </button>
    );
}

export function EquipmentSlots({
    equippedItems,
    onSlotClick,
    onUnequip,
    compact = false,
    className,
}: EquipmentSlotsProps) {
    
    const handleSlotClick = (slot: SlotType) => {
        const item = getItemForSlot(slot, equippedItems);
        onSlotClick?.(slot, item);
    };
    
    if (compact) {
        // Kompakt görünüm - tek satır
        return (
            <div className={cn("flex items-center gap-1 flex-wrap", className)}>
                {(Object.keys(EQUIPMENT_SLOTS) as SlotType[]).map(slot => {
                    const item = getItemForSlot(slot, equippedItems);
                    if (!item) return null;
                    return (
                        <EquipmentSlot
                            key={slot}
                            slot={slot}
                            item={item}
                            onClick={() => handleSlotClick(slot)}
                            compact
                        />
                    );
                })}
                {equippedItems.length === 0 && (
                    <span className="text-sm text-foreground-muted italic">
                        Kuşanılmış eşya yok
                    </span>
                )}
            </div>
        );
    }
    
    // Tam görünüm - Fantezi RPG tarzı layout
    return (
        <div className={cn("p-4 bg-background-elevated/30 rounded-xl", className)}>
            <h4 className="text-sm font-medium text-foreground-muted mb-4 text-center">
                Kuşanılan Eşyalar
            </h4>
            
            <div className="flex flex-col items-center gap-2">
                {/* Baş */}
                <div className="flex justify-center">
                    <EquipmentSlot
                        slot="head"
                        item={getItemForSlot("head", equippedItems)}
                        onClick={() => handleSlotClick("head")}
                    />
                </div>
                
                {/* Üst gövde: Sol el, Gövde, Sağ el */}
                <div className="flex items-center gap-2">
                    <EquipmentSlot
                        slot="mainHand"
                        item={getItemForSlot("mainHand", equippedItems)}
                        onClick={() => handleSlotClick("mainHand")}
                    />
                    <EquipmentSlot
                        slot="body"
                        item={getItemForSlot("body", equippedItems)}
                        onClick={() => handleSlotClick("body")}
                    />
                    <EquipmentSlot
                        slot="offHand"
                        item={getItemForSlot("offHand", equippedItems)}
                        onClick={() => handleSlotClick("offHand")}
                    />
                </div>
                
                {/* Orta: Eller, Pelerin */}
                <div className="flex items-center gap-2">
                    <EquipmentSlot
                        slot="hands"
                        item={getItemForSlot("hands", equippedItems)}
                        onClick={() => handleSlotClick("hands")}
                    />
                    <EquipmentSlot
                        slot="cloak"
                        item={getItemForSlot("cloak", equippedItems)}
                        onClick={() => handleSlotClick("cloak")}
                    />
                </div>
                
                {/* Ayaklar */}
                <div className="flex justify-center">
                    <EquipmentSlot
                        slot="feet"
                        item={getItemForSlot("feet", equippedItems)}
                        onClick={() => handleSlotClick("feet")}
                    />
                </div>
                
                {/* Aksesuarlar: Yüzükler ve Muska */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
                    <EquipmentSlot
                        slot="ring1"
                        item={getItemForSlot("ring1", equippedItems)}
                        onClick={() => handleSlotClick("ring1")}
                    />
                    <EquipmentSlot
                        slot="amulet"
                        item={getItemForSlot("amulet", equippedItems)}
                        onClick={() => handleSlotClick("amulet")}
                    />
                    <EquipmentSlot
                        slot="ring2"
                        item={getItemForSlot("ring2", equippedItems)}
                        onClick={() => handleSlotClick("ring2")}
                    />
                </div>
            </div>
            
            {/* Stats özeti */}
            <div className="mt-4 pt-3 border-t border-border/30 text-center">
                <p className="text-xs text-foreground-muted">
                    {equippedItems.length} / {Object.keys(EQUIPMENT_SLOTS).length} slot dolu
                </p>
            </div>
        </div>
    );
}

// Export için yardımcı tipler
export type { SlotType };
export { EQUIPMENT_SLOTS, getSlotForItemType, getItemSlot };
