"use client";

import { useState } from "react";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

// Item tipleri
const ITEM_TYPES = [
    { value: 'Weapon', label: 'Silah', emoji: '⚔️' },
    { value: 'Armor', label: 'Zırh', emoji: '🛡️' },
    { value: 'Shield', label: 'Kalkan', emoji: '🛡️' },
    { value: 'Helmet', label: 'Kask', emoji: '🪖' },
    { value: 'Boots', label: 'Bot', emoji: '👢' },
    { value: 'Gloves', label: 'Eldiven', emoji: '🧤' },
    { value: 'Cloak', label: 'Pelerin', emoji: '🧥' },
    { value: 'Ring', label: 'Yüzük', emoji: '💍' },
    { value: 'Amulet', label: 'Muska', emoji: '📿' },
    { value: 'Accessory', label: 'Aksesuar', emoji: '🎀' },
    { value: 'Potion', label: 'İksir', emoji: '🧪' },
    { value: 'Scroll', label: 'Parşömen', emoji: '📜' },
    { value: 'Tool', label: 'Alet', emoji: '🔧' },
    { value: 'Consumable', label: 'Sarf Malzemesi', emoji: '🍖' },
    { value: 'Treasure', label: 'Hazine', emoji: '💎' },
    { value: 'Misc', label: 'Diğer', emoji: '📦' },
];

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: {
        name: string;
        type: string;
        description?: string;
        quantity: number;
        weight: number;
        properties?: Record<string, any>;
    }) => Promise<void>;
}

export function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'Misc',
        description: '',
        quantity: 1,
        weight: 0,
        damage: '',
        armorClass: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Item adı gerekiyor');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const properties: Record<string, any> = {};
            if (formData.damage) properties.damage = formData.damage;
            if (formData.armorClass) properties.armorClass = parseInt(formData.armorClass);

            await onAdd({
                name: formData.name.trim(),
                type: formData.type,
                description: formData.description.trim() || undefined,
                quantity: formData.quantity,
                weight: formData.weight,
                properties: Object.keys(properties).length > 0 ? properties : undefined,
            });

            // Reset form
            setFormData({
                name: '',
                type: 'Misc',
                description: '',
                quantity: 1,
                weight: 0,
                damage: '',
                armorClass: '',
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Item eklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    const isWeapon = formData.type === 'Weapon';
    const isArmor = ['Armor', 'Shield', 'Helmet'].includes(formData.type);

    return (
        <Modal open={isOpen} onOpenChange={(open) => !open && onClose()} title="Yeni Item Ekle">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Name */}
                <Input
                    label="Item Adı"
                    placeholder="Uzun Kılıç"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                {/* Item Type */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Item Tipi
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {ITEM_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: type.value })}
                                className={cn(
                                    "px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all",
                                    formData.type === type.value
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background-elevated hover:bg-border text-foreground-secondary"
                                )}
                            >
                                <span>{type.emoji}</span>
                                <span className="truncate">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <Textarea
                    label="Açıklama (Opsiyonel)"
                    placeholder="Bu item hakkında detaylar..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                />

                {/* Quantity and Weight */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Adet
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                                className="p-2 rounded-lg bg-background-elevated hover:bg-border"
                            >
                                -
                            </button>
                            <span className="w-10 text-center font-bold">{formData.quantity}</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                                className="p-2 rounded-lg bg-background-elevated hover:bg-border"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        <Input
                            label="Ağırlık (lb)"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                {/* Weapon Properties */}
                {isWeapon && (
                    <Input
                        label="Hasar"
                        placeholder="1d8 + STR"
                        value={formData.damage}
                        onChange={(e) => setFormData({ ...formData, damage: e.target.value })}
                    />
                )}

                {/* Armor Properties */}
                {isArmor && (
                    <Input
                        label="Armor Class (AC) Bonus"
                        type="number"
                        min="0"
                        placeholder="15"
                        value={formData.armorClass}
                        onChange={(e) => setFormData({ ...formData, armorClass: e.target.value })}
                    />
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-danger">{error}</p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        İptal
                    </Button>
                    <Button type="submit" disabled={isLoading} className="gap-2">
                        {isLoading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        Ekle
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
