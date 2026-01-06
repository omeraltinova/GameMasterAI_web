"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Plus, Package, Weight, RefreshCw, Loader2 } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { AddItemModal } from "./AddItemModal";

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

interface InventoryGridProps {
    characterId: string;
    className?: string;
    editable?: boolean;
}

export function InventoryGrid({
    characterId,
    className,
    editable = true,
}: InventoryGridProps) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [equipped, setEquipped] = useState<InventoryItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchInventory = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/characters/${characterId}/inventory`);
            const data = await response.json();

            if (data.success) {
                setItems(data.items);
                setEquipped(data.equipped);
                setInventory(data.inventory);
                setTotalWeight(data.totalWeight);
                setError(null);
            } else {
                setError(data.error || 'Envanter yüklenemedi');
            }
        } catch (err) {
            setError('Envanter yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    }, [characterId]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleAddItem = async (itemData: any) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData),
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            await fetchInventory();
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEquip = async (itemId: string, equip: boolean) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory/${itemId}/equip`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipped: equip }),
            });
            const data = await response.json();

            if (data.success) {
                await fetchInventory();
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm('Bu item\'ı silmek istediğinize emin misiniz?')) return;

        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory/${itemId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                await fetchInventory();
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center py-8", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("text-center py-8", className)}>
                <p className="text-danger mb-4">{error}</p>
                <Button variant="outline" onClick={fetchInventory} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Envanter
                    </h3>
                    <Badge variant="secondary" className="gap-1">
                        <Weight className="h-3 w-3" />
                        {totalWeight} lb
                    </Badge>
                    <Badge variant="secondary">
                        {items.length} item
                    </Badge>
                </div>

                {editable && (
                    <Button onClick={() => setShowAddModal(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Item Ekle
                    </Button>
                )}
            </div>

            {/* Equipped Items */}
            {equipped.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-foreground-muted mb-3">
                        Kuşanılmış Eşyalar ({equipped.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {equipped.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onEquip={editable ? handleEquip : undefined}
                                onDelete={editable ? handleDelete : undefined}
                                isLoading={isActionLoading}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory Items */}
            <div>
                <h4 className="text-sm font-medium text-foreground-muted mb-3">
                    Çantadaki Eşyalar ({inventory.length})
                </h4>
                {inventory.length === 0 ? (
                    <div className="text-center py-8 text-foreground-muted">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Çantan boş</p>
                        {editable && (
                            <Button
                                variant="outline"
                                onClick={() => setShowAddModal(true)}
                                className="mt-3 gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                İlk Item'ını Ekle
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {inventory.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onEquip={editable ? handleEquip : undefined}
                                onDelete={editable ? handleDelete : undefined}
                                isLoading={isActionLoading}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Item Modal */}
            <AddItemModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddItem}
            />
        </div>
    );
}
