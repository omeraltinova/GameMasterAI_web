"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@/components/ui";
import { EquipmentSlots } from "@/components/character/EquipmentSlots";
import { ItemCard } from "@/components/character/ItemCard";
import { ItemDetailModal } from "@/components/character/ItemDetailModal";
import { AddItemModal } from "@/components/character/AddItemModal";
import { get } from "@/lib/api/client";
import type { InventoryItem } from "@/types";
import {
    ArrowLeft,
    Plus,
    Package,
    Weight,
    Search,
    RefreshCw,
    Loader2,
    Coins,
    Backpack,
} from "lucide-react";

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    gold?: number;
    stats: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
}

// Filtre kategorileri
const FILTER_CATEGORIES = [
    { value: "all", label: "Tümü", icon: Package },
    { value: "weapon", label: "Silahlar", types: ["Weapon"] },
    { value: "armor", label: "Zırhlar", types: ["Armor", "Shield", "Helmet", "Boots", "Gloves"] },
    { value: "accessory", label: "Aksesuarlar", types: ["Ring", "Amulet", "Accessory", "Cloak"] },
    { value: "consumable", label: "Tüketilebilir", types: ["Potion", "Scroll", "Consumable"] },
    { value: "misc", label: "Diğer", types: ["Tool", "Treasure", "Misc"] },
];

export default function InventoryPage() {
    const params = useParams();
    const characterId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [character, setCharacter] = useState<Character | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [equipped, setEquipped] = useState<InventoryItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [goldAdjustment, setGoldAdjustment] = useState("10");
    const [isUpdatingGold, setIsUpdatingGold] = useState(false);

    // Karakter bilgilerini ve envanteri yükle
    const fetchData = useCallback(async () => {
        if (!characterId) return;

        try {
            setIsLoading(true);
            setError(null);

            // Paralel olarak karakter ve envanter bilgilerini al
            const [characterRes, inventoryRes] = await Promise.all([
                get<{ success: boolean; characters: Character[] }>("/characters"),
                fetch(`/api/characters/${characterId}/inventory`).then(r => r.json()),
            ]);

            const foundCharacter = characterRes?.characters?.find(c => c.id === characterId);
            if (!foundCharacter) {
                setError("Karakter bulunamadı");
                return;
            }

            setCharacter({
                ...foundCharacter,
                gold: foundCharacter.gold ?? 0,
            });

            if (inventoryRes.success) {
                setItems(inventoryRes.items || []);
                setEquipped(inventoryRes.equipped || []);
                setInventory(inventoryRes.inventory || []);
                setTotalWeight(inventoryRes.totalWeight || 0);
            }
        } catch (err) {
            console.error("Data fetch error:", err);
            setError("Veriler yüklenirken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [characterId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // API İşlemleri
    const handleAddItem = async (itemData: Record<string, unknown>) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(itemData),
            });
            const data = await response.json();
            if (data.success) {
                await fetchData();
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEquip = async (itemId: string, equip: boolean) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory/${itemId}/equip`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ equipped: equip }),
            });
            const data = await response.json();
            if (data.success) {
                await fetchData();
                // Seçili item'ı güncelle
                setSelectedItem(prev => prev?.id === itemId ? { ...prev, equipped: equip } : prev);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdate = async (itemId: string, updateData: Partial<InventoryItem>) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });
            const data = await response.json();
            if (data.success) {
                await fetchData();
                setSelectedItem(prev => prev?.id === itemId ? { ...prev, ...updateData } : prev);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        setIsActionLoading(true);
        try {
            const response = await fetch(`/api/characters/${characterId}/inventory/${itemId}`, {
                method: "DELETE",
            });
            const data = await response.json();
            if (data.success) {
                await fetchData();
                setSelectedItem(null);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleGoldAdjust = async (direction: 1 | -1) => {
        if (!characterId || !character) return;
        const parsedAmount = Number.parseInt(goldAdjustment, 10);
        const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

        if (amount <= 0) {
            setError("Altın işlemi için 0'dan büyük bir miktar girin");
            return;
        }

        const currentGold = character.gold ?? 0;
        const nextGold = Math.max(0, currentGold + direction * amount);
        if (nextGold === currentGold) {
            return;
        }

        setIsUpdatingGold(true);
        setError(null);
        try {
            const response = await fetch(`/api/characters/${characterId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gold: nextGold }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Altın güncellenemedi");
            }

            const updatedGold = Number.isInteger(data.character?.gold)
                ? data.character.gold
                : nextGold;
            setCharacter((prev) => (prev ? { ...prev, gold: updatedGold } : prev));
        } catch (err) {
            console.error("Gold update error:", err);
            setError(err instanceof Error ? err.message : "Altın güncellenemedi");
        } finally {
            setIsUpdatingGold(false);
        }
    };

    // Filtreleme
    const filteredInventory = inventory.filter(item => {
        // Arama filtresi
        const matchesSearch = !searchQuery || 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.type.toLowerCase().includes(searchQuery.toLowerCase());

        // Kategori filtresi
        const filterCategory = FILTER_CATEGORIES.find(f => f.value === activeFilter);
        const matchesFilter = activeFilter === "all" || 
            (filterCategory?.types?.includes(item.type));

        return matchesSearch && matchesFilter;
    });

    // Taşıma kapasitesi hesaplama (5e SRD: STR * 15)
    const carryingCapacity = character ? (character.stats?.strength || 10) * 15 : 150;
    const weightPercentage = Math.min((totalWeight / carryingCapacity) * 100, 100);
    const isEncumbered = totalWeight > carryingCapacity;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
        );
    }

    if (error || !character) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-foreground-muted mb-4" />
                <h1 className="text-2xl font-bold mb-2">{error || "Karakter bulunamadı"}</h1>
                <Link href="/characters">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Karakterlere Dön
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/characters/${characterId}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Karaktere Dön
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Backpack className="h-6 w-6 text-primary" />
                            {character.name}&apos;in Envanteri
                        </h1>
                        <p className="text-sm text-foreground-muted">
                            Seviye {character.level} {character.race} {character.class}
                        </p>
                    </div>
                </div>

                <Button onClick={() => setShowAddModal(true)} className="gap-2" disabled={isActionLoading}>
                    <Plus className="h-4 w-4" />
                    Item Ekle
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Toplam Item */}
                <Card>
                    <CardContent className="p-4 text-center">
                        <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold">{items.length}</p>
                        <p className="text-xs text-foreground-muted">Toplam Item</p>
                    </CardContent>
                </Card>

                {/* Ağırlık */}
                <Card>
                    <CardContent className="p-4 text-center">
                        <Weight className="h-5 w-5 mx-auto mb-1 text-warning" />
                        <p className={`text-2xl font-bold ${isEncumbered ? "text-danger" : ""}`}>
                            {totalWeight} / {carryingCapacity}
                        </p>
                        <p className="text-xs text-foreground-muted">Ağırlık (lb)</p>
                        <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all ${isEncumbered ? "bg-danger" : "bg-primary"}`}
                                style={{ width: `${weightPercentage}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Kuşanılan */}
                <Card>
                    <CardContent className="p-4 text-center">
                        <Backpack className="h-5 w-5 mx-auto mb-1 text-secondary" />
                        <p className="text-2xl font-bold">{equipped.length}</p>
                        <p className="text-xs text-foreground-muted">Kuşanılan</p>
                    </CardContent>
                </Card>

                {/* Altın */}
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center mb-3">
                            <Coins className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                            <p className="text-2xl font-bold">{character.gold ?? 0}</p>
                            <p className="text-xs text-foreground-muted">Altın</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                value={goldAdjustment}
                                onChange={(e) => setGoldAdjustment(e.target.value)}
                                className="w-full h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                aria-label="Altın miktarı"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => void handleGoldAdjust(-1)}
                                disabled={isUpdatingGold}
                            >
                                -
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => void handleGoldAdjust(1)}
                                disabled={isUpdatingGold}
                            >
                                +
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Sol: Equipment Slots */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Ekipman Slotları</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EquipmentSlots
                                equippedItems={equipped}
                                onSlotClick={(slot, item) => {
                                    if (item) {
                                        setSelectedItem(item);
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Sağ: Inventory Grid */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Arama ve Filtreler */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Arama */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                                    <Input
                                        placeholder="Item ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {/* Yenile */}
                                <Button 
                                    variant="outline" 
                                    onClick={fetchData}
                                    disabled={isLoading}
                                    className="gap-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                    Yenile
                                </Button>
                            </div>

                            {/* Kategori Filtreleri */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {FILTER_CATEGORIES.map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setActiveFilter(filter.value)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                            activeFilter === filter.value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background-elevated hover:bg-border text-foreground-secondary"
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inventory Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    Çanta
                                </span>
                                <Badge variant="secondary">
                                    {filteredInventory.length} item
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredInventory.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="h-12 w-12 mx-auto mb-3 text-foreground-muted opacity-30" />
                                    <p className="text-foreground-secondary">
                                        {searchQuery || activeFilter !== "all" 
                                            ? "Eşleşen item bulunamadı" 
                                            : "Çantan boş"}
                                    </p>
                                    {!searchQuery && activeFilter === "all" && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowAddModal(true)}
                                            className="mt-4 gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            İlk Item&apos;ını Ekle
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredInventory.map((item) => (
                                        <ItemCard
                                            key={item.id}
                                            item={item}
                                            onClick={setSelectedItem}
                                            showActions={false}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <AddItemModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddItem}
            />

            <ItemDetailModal
                item={selectedItem}
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                onEquip={handleEquip}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                editable={true}
            />
        </div>
    );
}
