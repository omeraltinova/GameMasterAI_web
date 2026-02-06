"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Badge,
  Avatar,
} from "@/components/ui";
import {
  ArrowLeft,
  Save,
  Trash2,
  Users,
  Settings,
  AlertTriangle,
  Loader2,
  UserMinus,
  Crown,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  Copy,
} from "lucide-react";
import { get, put, del, post } from "@/lib/api/client";

export default function CampaignSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [campaign, setCampaign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state variables
  const [isRefreshingInvite, setIsRefreshingInvite] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxPlayers: 4,
    isMultiplayer: false,
  });

  const campaignId = params.id as string;
  const isCreator = campaign?.creatorId === session?.user?.id;

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      setIsLoading(true);
      try {
        const response = (await get(`/campaigns/${campaignId}`)) as {
          success: boolean;
          campaign: any;
        };
        if (response?.success && response.campaign) {
          setCampaign(response.campaign);
          setFormData({
            name: response.campaign.name || "",
            description: response.campaign.description || "",
            maxPlayers: response.campaign.maxPlayers || 4,
            isMultiplayer: response.campaign.isMultiplayer || false,
          });
        }
      } catch (err) {
        console.error("Campaign alınamadı:", err);
        setError("Oturum yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  // Handle save
  const handleSave = async () => {
    if (!isCreator) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = (await put(`/campaigns/${campaignId}`, formData)) as {
        success: boolean;
      };
      if (response?.success) {
        setSuccessMessage("Değişiklikler kaydedildi");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Kaydetme başarısız");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!isCreator) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = (await del(`/campaigns/${campaignId}`)) as {
        success: boolean;
      };
      if (response?.success) {
        router.push("/campaigns");
      }
    } catch (err: any) {
      setError(err?.message || "Silme başarısız");
      setIsDeleting(false);
    }
  };

  // Handle invite code refresh
  const handleRefreshInvite = async () => {
    if (!isCreator) return;

    setIsRefreshingInvite(true);
    setError(null);

    try {
      const response = (await post(`/campaigns/${campaignId}/invite`, {})) as {
        success: boolean;
        inviteCode: string;
      };
      if (response?.success) {
        setCampaign({ ...campaign, inviteCode: response.inviteCode });
        setSuccessMessage("Yeni davet kodu oluşturuldu");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Davet kodu yenilenemedi");
    } finally {
      setIsRefreshingInvite(false);
    }
  };

  // Handle copy invite code
  const handleCopyInvite = () => {
    if (campaign?.inviteCode) {
      navigator.clipboard.writeText(campaign.inviteCode);
      setSuccessMessage("Davet kodu kopyalandı");
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  // Handle status change
  const handleStatusChange = async (action: 'pause' | 'resume' | 'complete') => {
    if (!isCreator) return;

    setIsChangingStatus(true);
    setError(null);

    try {
      const response = (await post(`/campaigns/${campaignId}/${action}`, {})) as {
        success: boolean;
      };
      if (response?.success) {
        const newStatus = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'COMPLETED';
        setCampaign({ ...campaign, status: newStatus });
        setSuccessMessage(
          action === 'pause' ? 'Oturum duraklatıldı' :
            action === 'resume' ? 'Oturum devam ediyor' :
              'Oturum tamamlandı'
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowCompleteConfirm(false);
      }
    } catch (err: any) {
      setError(err?.message || "Durum değiştirilemedi");
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Handle kick player
  const handleKickPlayer = async (playerId: string) => {
    if (!isCreator) return;

    setKickingPlayerId(playerId);
    setError(null);

    try {
      const response = (await del(`/campaigns/${campaignId}/players/${playerId}`)) as {
        success: boolean;
      };
      if (response?.success) {
        setCampaign({
          ...campaign,
          players: campaign.players.filter((p: any) => p.id !== playerId),
        });
        setSuccessMessage("Oyuncu oturumdan çıkarıldı");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Oyuncu çıkarılamadı");
    } finally {
      setKickingPlayerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Oturum bulunamadı</h1>
        <Link href="/campaigns">
          <Button variant="outline">Oturumlara Dön</Button>
        </Link>
      </div>
    );
  }

  // Non-creator view
  if (!isCreator) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href={`/campaigns/${campaignId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Oturuma Dön
          </Button>
        </Link>

        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Yetkiniz Yok</h2>
            <p className="text-foreground-secondary">
              Oturum ayarlarını sadece oturum kurucusu düzenleyebilir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href={`/campaigns/${campaignId}`}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Oturuma Dön
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Oturum Ayarları</h1>
        <p className="text-foreground-secondary">{campaign.name}</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-success/10 border border-success text-success text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Genel Ayarlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Oturum Adı"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Oturum adı..."
          />

          <Textarea
            label="Açıklama"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Oturum açıklaması..."
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Maksimum Oyuncu Sayısı
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, maxPlayers: num })}
                  className={`px-4 py-2 rounded-lg transition-all ${formData.maxPlayers === num
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-elevated hover:bg-border"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Değişiklikleri Kaydet
          </Button>
        </CardContent>
      </Card>

      {/* Invite Code Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Davet Kodu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Bu kodu diğer oyuncularla paylaşarak oturuma katılmalarını sağlayabilirsiniz.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-background-elevated rounded-lg font-mono text-lg tracking-wider text-center">
              {campaign.inviteCode || "—"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInvite}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Kopyala
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshInvite}
              disabled={isRefreshingInvite}
              className="gap-2"
            >
              {isRefreshingInvite ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Yenile
            </Button>
          </div>
          <p className="text-xs text-foreground-muted">
            Not: Kodu yenilemek, eski kodu geçersiz kılacaktır.
          </p>
        </CardContent>
      </Card>

      {/* Campaign Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {campaign.status === 'ACTIVE' && <Play className="h-5 w-5 text-success" />}
            {campaign.status === 'PAUSED' && <Pause className="h-5 w-5 text-warning" />}
            {campaign.status === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-primary" />}
            {campaign.status === 'DRAFT' && <Settings className="h-5 w-5 text-foreground-muted" />}
            Oturum Durumu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-foreground-secondary">Mevcut Durum:</span>
            <Badge
              variant={
                campaign.status === 'ACTIVE' ? 'primary' :
                  campaign.status === 'PAUSED' ? 'secondary' :
                    campaign.status === 'COMPLETED' ? 'primary' :
                      'secondary'
              }
            >
              {campaign.status === 'ACTIVE' && 'Aktif'}
              {campaign.status === 'PAUSED' && 'Duraklatıldı'}
              {campaign.status === 'COMPLETED' && 'Tamamlandı'}
              {campaign.status === 'DRAFT' && 'Taslak'}
            </Badge>
          </div>

          {campaign.status !== 'COMPLETED' && (
            <div className="flex flex-wrap gap-3">
              {campaign.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('pause')}
                  disabled={isChangingStatus}
                  className="gap-2"
                >
                  {isChangingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  Duraklat
                </Button>
              )}

              {campaign.status === 'PAUSED' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('resume')}
                  disabled={isChangingStatus}
                  className="gap-2"
                >
                  {isChangingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Devam Et
                </Button>
              )}

              {!showCompleteConfirm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCompleteConfirm(true)}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Oturumu Tamamla
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning">
                  <span className="text-sm text-warning">Emin misiniz?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompleteConfirm(false)}
                    disabled={isChangingStatus}
                  >
                    İptal
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('complete')}
                    disabled={isChangingStatus}
                    className="gap-2"
                  >
                    {isChangingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Tamamla
                  </Button>
                </div>
              )}
            </div>
          )}

          {campaign.status === 'COMPLETED' && (
            <p className="text-sm text-foreground-muted">
              Bu oturum tamamlanmış. Artık durum değiştirilemez.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Players Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Oyuncu Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaign.players?.map((player: any) => (
              <div
                key={player.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-background-elevated"
              >
                <Avatar
                  src={player.user?.avatar}
                  fallback={player.user?.username}
                  size="md"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.user?.username}</span>
                    {player.userId === campaign.creatorId && (
                      <Badge variant="primary" size="sm">
                        <Crown className="h-3 w-3 mr-1" />
                        Kurucu
                      </Badge>
                    )}
                  </div>
                  {player.character && (
                    <p className="text-sm text-foreground-muted">
                      {player.character.name} - Lv.{player.character.level}
                    </p>
                  )}
                </div>
                {player.userId !== campaign.creatorId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={kickingPlayerId === player.id}
                    onClick={() => handleKickPlayer(player.id)}
                  >
                    {kickingPlayerId === player.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Tehlikeli Bölge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              Oturumu silmek geri alınamaz bir işlemdir. Tüm oyun verileri,
              mesajlar ve session bilgileri kalıcı olarak silinecektir.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Oturumu Sil
              </Button>
            ) : (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive space-y-4">
                <p className="text-sm font-medium text-destructive">
                  Bu işlem geri alınamaz! Oturumu silmek istediğinize emin
                  misiniz?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    İptal
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Evet, Sil
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


