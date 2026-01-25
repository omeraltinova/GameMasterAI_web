"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Input,
  Modal,
  Select,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  ExternalLink,
  Map,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  genre: string;
  difficulty: string;
  isOfficial: boolean;
  isFeatured?: boolean;
  tags?: string[] | string | null;
  createdAt: string;
  creator: {
    username: string;
    email: string;
  } | null;
  _count: {
    campaigns: number;
  };
}

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  scenarios: Array<{ id: string; title: string }>;
  scenarioIds: string[];
}

const difficulties = ["Easy", "Medium", "Hard"];

function parseTags(tags?: Scenario["tags"]) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [officialLoadingId, setOfficialLoadingId] = useState<string | null>(null);
  const [featuredLoadingId, setFeaturedLoadingId] = useState<string | null>(null);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [editDifficulty, setEditDifficulty] = useState("Medium");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
    scenarioIds: [] as string[],
  });
  const [collectionScenarioSearch, setCollectionScenarioSearch] = useState("");
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionDeleteId, setCollectionDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    fetchScenarios();
    fetchCollections();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch("/api/admin/scenarios");
      if (res.ok) {
        setScenarios(await res.json());
      }
    } catch (error) {
      console.error("Senaryolar yüklenemedi", error);
      addToast({ type: "error", title: "Hata", description: "Veriler yüklenemedi" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/admin/collections");
      if (res.ok) {
        setCollections(await res.json());
      }
    } catch (error) {
      console.error("Koleksiyonlar yüklenemedi", error);
      addToast({ type: "error", title: "Hata", description: "Koleksiyonlar yüklenemedi" });
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/scenarios?id=${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setScenarios(scenarios.filter((s) => s.id !== deleteId));
        addToast({ type: "success", title: "Başarılı", description: "Senaryo silindi." });
      } else {
        throw new Error("Silme başarısız");
      }
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Senaryo silinemedi." });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleOfficial = async (scenario: Scenario) => {
    const nextValue = !scenario.isOfficial;
    setOfficialLoadingId(scenario.id);

    try {
      const res = await fetch("/api/admin/scenarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scenario.id, isOfficial: nextValue }),
      });

      if (!res.ok) {
        throw new Error("Güncelleme başarısız");
      }

      setScenarios((prev) =>
        prev.map((s) => (s.id === scenario.id ? { ...s, isOfficial: nextValue } : s))
      );

      addToast({
        type: "success",
        title: "Güncellendi",
        description: nextValue ? "Senaryo resmi yapıldı." : "Senaryo resmiyetten kaldırıldı.",
      });
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Güncelleme yapılamadı." });
    } finally {
      setOfficialLoadingId(null);
    }
  };

  const toggleFeatured = async (scenario: Scenario) => {
    const nextValue = !scenario.isFeatured;
    setFeaturedLoadingId(scenario.id);

    try {
      const res = await fetch("/api/admin/scenarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scenario.id, isFeatured: nextValue }),
      });

      if (!res.ok) {
        throw new Error("Güncelleme başarısız");
      }

      setScenarios((prev) =>
        prev.map((s) => (s.id === scenario.id ? { ...s, isFeatured: nextValue } : s))
      );

      addToast({
        type: "success",
        title: "Güncellendi",
        description: nextValue ? "Senaryo öne çıkarıldı." : "Senaryo öne çıkarılmışlardan kaldırıldı.",
      });
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Güncelleme yapılamadı." });
    } finally {
      setFeaturedLoadingId(null);
    }
  };

  const openEditModal = (scenario: Scenario) => {
    setEditScenario(scenario);
    setEditDifficulty(scenario.difficulty || "Medium");
    setEditTags(parseTags(scenario.tags).join(", "));
  };

  const saveScenarioCuration = async () => {
    if (!editScenario) return;
    setEditSaving(true);

    const tagsArray = editTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/admin/scenarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editScenario.id,
          difficulty: editDifficulty,
          tags: tagsArray,
        }),
      });

      if (!res.ok) {
        throw new Error("Güncelleme başarısız");
      }

      setScenarios((prev) =>
        prev.map((s) =>
          s.id === editScenario.id
            ? { ...s, difficulty: editDifficulty, tags: tagsArray }
            : s
        )
      );

      addToast({ type: "success", title: "Güncellendi", description: "Senaryo kürasyonu güncellendi." });
      setEditScenario(null);
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Kürasyon güncellenemedi." });
    } finally {
      setEditSaving(false);
    }
  };

  const filteredScenarios = scenarios.filter((s) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const creatorName = s.creator?.username || "";
    return (
      s.title.toLowerCase().includes(normalizedSearch) ||
      creatorName.toLowerCase().includes(normalizedSearch)
    );
  });

  const filteredCollections = collections.filter((collection) => {
    const normalized = collectionSearch.toLowerCase();
    return (
      collection.name.toLowerCase().includes(normalized) ||
      (collection.description || "").toLowerCase().includes(normalized)
    );
  });

  const collectionScenarioOptions = useMemo(() => {
    const normalized = collectionScenarioSearch.toLowerCase();
    return scenarios.filter((scenario) => {
      if (!normalized) return true;
      return (
        scenario.title.toLowerCase().includes(normalized) ||
        scenario.genre.toLowerCase().includes(normalized)
      );
    });
  }, [collectionScenarioSearch, scenarios]);

  const toggleScenarioSelection = (scenarioId: string) => {
    setCollectionForm((prev) => {
      if (prev.scenarioIds.includes(scenarioId)) {
        return { ...prev, scenarioIds: prev.scenarioIds.filter((id) => id !== scenarioId) };
      }
      return { ...prev, scenarioIds: [...prev.scenarioIds, scenarioId] };
    });
  };

  const openCreateCollection = () => {
    setEditingCollection(null);
    setCollectionForm({ name: "", description: "", scenarioIds: [] });
    setCollectionScenarioSearch("");
    setCollectionModalOpen(true);
  };

  const openEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionForm({
      name: collection.name,
      description: collection.description || "",
      scenarioIds: collection.scenarioIds || [],
    });
    setCollectionScenarioSearch("");
    setCollectionModalOpen(true);
  };

  const saveCollection = async () => {
    if (!collectionForm.name.trim()) {
      addToast({ type: "error", title: "Hata", description: "Koleksiyon adı gerekli" });
      return;
    }

    setCollectionSaving(true);
    try {
      const endpoint = editingCollection
        ? `/api/admin/collections/${editingCollection.id}`
        : "/api/admin/collections";
      const method = editingCollection ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectionForm.name,
          description: collectionForm.description,
          scenarioIds: collectionForm.scenarioIds,
        }),
      });

      if (!res.ok) {
        throw new Error("Kaydetme başarısız");
      }

      const data = await res.json();
      if (editingCollection) {
        setCollections((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        addToast({ type: "success", title: "Güncellendi", description: "Koleksiyon güncellendi." });
      } else {
        setCollections((prev) => [data, ...prev]);
        addToast({ type: "success", title: "Oluşturuldu", description: "Koleksiyon oluşturuldu." });
      }

      setCollectionModalOpen(false);
      setEditingCollection(null);
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Koleksiyon kaydedilemedi" });
    } finally {
      setCollectionSaving(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionDeleteId) return;
    try {
      const res = await fetch(`/api/admin/collections/${collectionDeleteId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Silme başarısız");
      }
      setCollections((prev) => prev.filter((c) => c.id !== collectionDeleteId));
      addToast({ type: "success", title: "Silindi", description: "Koleksiyon silindi." });
    } catch (error) {
      addToast({ type: "error", title: "Hata", description: "Koleksiyon silinemedi" });
    } finally {
      setCollectionDeleteId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Senaryolar</h1>
        <p className="text-foreground-secondary">Senaryo yönetimi ve içerik kürasyonu</p>
      </div>

      <Tabs defaultValue="scenarios">
        <TabsList>
          <TabsTrigger value="scenarios">Senaryo Listesi</TabsTrigger>
          <TabsTrigger value="collections">Koleksiyonlar</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <Input
                placeholder="Senaryo veya yazar ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-72"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background-elevated border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">Senaryo Adı</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Yazar</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Tür / Zorluk</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Etiketler</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Kullanım</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScenarios.map((scenario) => {
                      const tagList = parseTags(scenario.tags);
                      const visibleTags = tagList.slice(0, 3);
                      const extraCount = tagList.length - visibleTags.length;

                      return (
                        <tr key={scenario.id} className="border-b border-border hover:bg-background-elevated/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Map className="h-4 w-4 text-secondary" />
                              <div>
                                <p className="font-medium">{scenario.title}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {scenario.isOfficial && (
                                    <Badge variant="primary" className="text-[10px] py-0 h-4">Resmi</Badge>
                                  )}
                                  {scenario.isFeatured && (
                                    <Badge variant="warning" className="text-[10px] py-0 h-4">Öne Çıkan</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground-secondary">
                            {scenario.creator ? scenario.creator.username : (
                              <span className="text-foreground-muted italic">Anonim</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">{scenario.genre}</Badge>
                              <span className="text-xs text-foreground-muted">{scenario.difficulty}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2">
                              {visibleTags.map((tag) => (
                                <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
                              ))}
                              {extraCount > 0 && (
                                <Badge variant="outline" size="sm">+{extraCount}</Badge>
                              )}
                              {tagList.length === 0 && (
                                <span className="text-xs text-foreground-muted">Etiket yok</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground-secondary">
                            {scenario._count.campaigns} Kampanya
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                isLoading={officialLoadingId === scenario.id}
                                className={
                                  scenario.isOfficial
                                    ? "text-warning hover:text-warning"
                                    : "text-foreground-secondary hover:text-foreground"
                                }
                                onClick={() => toggleOfficial(scenario)}
                                title={scenario.isOfficial ? "Resmiyetten kaldır" : "Resmi yap"}
                                aria-label={scenario.isOfficial ? "Resmiyetten kaldır" : "Resmi yap"}
                                leftIcon={<Star className="h-4 w-4" />}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                isLoading={featuredLoadingId === scenario.id}
                                className={
                                  scenario.isFeatured
                                    ? "text-warning hover:text-warning"
                                    : "text-foreground-secondary hover:text-foreground"
                                }
                                onClick={() => toggleFeatured(scenario)}
                                title={scenario.isFeatured ? "Öne çıkarılmışlardan kaldır" : "Öne çıkar"}
                                aria-label={scenario.isFeatured ? "Öne çıkarılmışlardan kaldır" : "Öne çıkar"}
                                leftIcon={<Sparkles className="h-4 w-4" />}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(scenario)}
                                title="Etiket/Zorluk düzenle"
                                aria-label="Etiket/Zorluk düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Link href={`/scenarios/${scenario.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" title="Görüntüle">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:text-danger hover:bg-danger/10"
                                onClick={() => setDeleteId(scenario.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredScenarios.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-foreground-muted">
                          Senaryo bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Input
              placeholder="Koleksiyon ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              className="w-full sm:w-72"
            />
            <Button onClick={openCreateCollection} leftIcon={<Plus className="h-4 w-4" />}>
              Yeni Koleksiyon
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background-elevated border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">Koleksiyon</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Senaryolar</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Güncelleme</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionsLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <Spinner size="md" />
                        </td>
                      </tr>
                    ) : (
                      filteredCollections.map((collection) => {
                        const preview = collection.scenarios.slice(0, 3);
                        const extra = collection.scenarios.length - preview.length;

                        return (
                          <tr key={collection.id} className="border-b border-border hover:bg-background-elevated/50">
                            <td className="py-3 px-4">
                              <p className="font-medium">{collection.name}</p>
                              {collection.description && (
                                <p className="text-xs text-foreground-muted mt-1">
                                  {collection.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                {preview.map((scenario) => (
                                  <Badge key={scenario.id} variant="outline" size="sm">
                                    {scenario.title}
                                  </Badge>
                                ))}
                                {extra > 0 && (
                                  <Badge variant="outline" size="sm">+{extra}</Badge>
                                )}
                                {collection.scenarios.length === 0 && (
                                  <span className="text-xs text-foreground-muted">Henüz senaryo yok</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground-secondary">
                              {new Date(collection.updatedAt).toLocaleDateString("tr-TR")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCollection(collection)}
                                  title="Düzenle"
                                  aria-label="Düzenle"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-danger hover:text-danger hover:bg-danger/10"
                                  onClick={() => setCollectionDeleteId(collection.id)}
                                  title="Sil"
                                  aria-label="Sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {!collectionsLoading && filteredCollections.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-foreground-muted">
                          Koleksiyon bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Senaryoyu Sil"
        description="Bu senaryo kalıcı olarak silinecek. Emin misiniz?"
        variant="danger"
        confirmText="Sil"
      />

      <ConfirmDialog
        isOpen={!!collectionDeleteId}
        onClose={() => setCollectionDeleteId(null)}
        onConfirm={handleDeleteCollection}
        title="Koleksiyonu Sil"
        description="Bu koleksiyon kalıcı olarak silinecek."
        variant="danger"
        confirmText="Sil"
      />

      <Modal
        open={!!editScenario}
        onOpenChange={(open) => {
          if (!open) setEditScenario(null);
        }}
        title="Senaryo Kürasyonu"
        description={editScenario ? editScenario.title : undefined}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Zorluk"
            value={editDifficulty}
            onChange={(e) => setEditDifficulty(e.target.value)}
            options={difficulties.map((d) => ({ value: d, label: d }))}
          />
          <Input
            label="Etiketler"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="dragon, dungeon, magic"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditScenario(null)}>
              Vazgeç
            </Button>
            <Button onClick={saveScenarioCuration} isLoading={editSaving}>
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={collectionModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCollectionModalOpen(false);
            setEditingCollection(null);
          }
        }}
        title={editingCollection ? "Koleksiyon Düzenle" : "Yeni Koleksiyon"}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Koleksiyon Adı"
            value={collectionForm.name}
            onChange={(e) => setCollectionForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Karanlık Fantezi"
          />
          <Textarea
            label="Açıklama"
            value={collectionForm.description}
            onChange={(e) => setCollectionForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tematik seçimler için kısa açıklama"
          />
          <Input
            label="Senaryo Ara"
            value={collectionScenarioSearch}
            onChange={(e) => setCollectionScenarioSearch(e.target.value)}
            placeholder="Başlık veya tür"
          />
          <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
            {collectionScenarioOptions.map((scenario) => {
              const checked = collectionForm.scenarioIds.includes(scenario.id);
              return (
                <label
                  key={scenario.id}
                  className="flex items-center gap-3 text-sm text-foreground-secondary"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleScenarioSelection(scenario.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1">{scenario.title}</span>
                  <Badge variant="outline" size="sm">{scenario.genre}</Badge>
                </label>
              );
            })}
            {collectionScenarioOptions.length === 0 && (
              <p className="text-sm text-foreground-muted">Eşleşen senaryo yok.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCollectionModalOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={saveCollection} isLoading={collectionSaving}>
              {editingCollection ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
