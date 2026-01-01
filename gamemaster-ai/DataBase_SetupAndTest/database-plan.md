# 🗄️ GameMaster AI - Veritabanı Planı

> Bu belge, GameMaster AI projesinin veritabanı yapısını tanımlar.

---

## 📋 Genel Bilgiler

| Özellik | Değer |
|---------|-------|
| **ORM** | Prisma |
| **Veritabanı** | SQLite (development) |
| **Şema Dosyası** | `prisma/schema.prisma` |

---

## 📊 Tablo Yapısı

### 1. User (Kullanıcı)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `email` | String | Unique, giriş için |
| `username` | String | Unique, görünen isim |
| `password` | String | Hashlenmiş şifre |
| `role` | Enum | VISITOR, MEMBER, ADMIN |
| `avatar` | String? | Profil resmi URL |
| `createdAt` | DateTime | Kayıt tarihi |
| `updatedAt` | DateTime | Güncelleme tarihi |

**İlişkiler:** characters (1:N), campaigns (1:N), scenarios (1:N)

---

### 2. Character (Karakter)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `userId` | String | FK → User |
| `campaignId` | String? | FK → Campaign |
| `name` | String | Karakter adı |
| `race` | String | Irk (Human, Elf, Dwarf...) |
| `class` | String | Sınıf (Fighter, Wizard...) |
| `level` | Int | Seviye (1-20) |
| `experience` | Int | XP puanı |
| `hp` | Int | Mevcut can |
| `maxHp` | Int | Maksimum can |
| `stats` | JSON | {str, dex, con, int, wis, cha} |
| `background` | String? | Karakter geçmişi |
| `imageUrl` | String? | Karakter görseli |
| `createdAt` | DateTime | Oluşturma tarihi |
| `updatedAt` | DateTime | Güncelleme tarihi |

---

### 3. Campaign (Kampanya)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `name` | String | Kampanya adı |
| `description` | String? | Açıklama |
| `creatorId` | String | FK → User |
| `scenarioId` | String? | FK → Scenario |
| `isMultiplayer` | Boolean | Çok oyunculu mu? |
| `maxPlayers` | Int | Maksimum oyuncu (default: 4) |
| `inviteCode` | String? | Unique, katılım kodu |
| `status` | Enum | DRAFT, ACTIVE, PAUSED, COMPLETED |
| `createdAt` | DateTime | Oluşturma tarihi |
| `updatedAt` | DateTime | Güncelleme tarihi |

---

### 4. GameSession (Oyun Oturumu)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `campaignId` | String | FK → Campaign |
| `currentState` | JSON | Mevcut oyun durumu |
| `turnOrder` | JSON? | Sıra listesi |
| `activePlayer` | String? | Aktif oyuncu ID |
| `aiContext` | Text? | AI için context/memory |
| `createdAt` | DateTime | Başlangıç |
| `updatedAt` | DateTime | Son güncelleme |

---

### 5. Message (Mesaj)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `senderId` | String? | FK → User (null = GM/System) |
| `senderType` | Enum | PLAYER, GM, SYSTEM, DICE, COMBAT |
| `content` | Text | Mesaj içeriği |
| `metadata` | JSON? | Ek veri |
| `timestamp` | DateTime | Gönderim zamanı |

---

### 6. DiceRoll (Zar Atımı)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `characterId` | String? | FK → Character |
| `diceType` | String | d4, d6, d8, d10, d12, d20, d100 |
| `count` | Int | Zar sayısı |
| `results` | JSON | Sonuç dizisi |
| `modifier` | Int | Modifier değeri |
| `total` | Int | Toplam sonuç |
| `purpose` | String? | "Attack Roll" vb. |
| `timestamp` | DateTime | Atım zamanı |

---

### 7. Scenario (Senaryo)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `title` | String | Senaryo başlığı |
| `description` | Text | Açıklama |
| `genre` | String | Fantasy, Horror, Sci-Fi... |
| `difficulty` | String | Easy, Medium, Hard |
| `startingPrompt` | Text | AI için başlangıç prompt'u |
| `isOfficial` | Boolean | Resmi senaryo mu? |
| `isAIGenerated` | Boolean | AI tarafından mı oluşturuldu? |
| `creatorId` | String? | FK → User |
| `tags` | JSON? | Tag dizisi |
| `createdAt` | DateTime | Oluşturma tarihi |

---

### 8. NPC (Non-Player Character)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `name` | String | NPC adı |
| `race` | String? | Irk |
| `role` | String | Merchant, Guard, Villain... |
| `personality` | Text? | Kişilik özellikleri |
| `stats` | JSON? | Stat bloğu |
| `isHostile` | Boolean | Düşman mı? |
| `dialogue` | JSON? | Diyalog geçmişi |
| `imageUrl` | String? | NPC görseli |
| `createdAt` | DateTime | Oluşturma tarihi |

---

### 9. Combat (Savaş)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `participants` | JSON | Katılımcı listesi |
| `turnOrder` | JSON | Initiative sırası |
| `currentTurn` | Int | Şu anki sıra indexi |
| `round` | Int | Kaçıncı round |
| `status` | String | active, ended |
| `log` | JSON? | Savaş logu |
| `createdAt` | DateTime | Başlangıç |

---

### 10. InventoryItem (Envanter Öğesi)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `characterId` | String | FK → Character |
| `name` | String | Item adı |
| `type` | String | Weapon, Armor, Potion... |
| `description` | String? | Açıklama |
| `quantity` | Int | Miktar |
| `properties` | JSON? | Özellikler |
| `equipped` | Boolean | Kuşanılmış mı? |
| `weight` | Float | Ağırlık (lb) |

---

### 11. Map (Harita)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `name` | String? | Harita adı |
| `description` | String? | Açıklama |
| `imageUrl` | String | Görsel URL |
| `isAIGenerated` | Boolean | AI oluşturdu mu? |
| `prompt` | String? | Oluşturma prompt'u |
| `createdAt` | DateTime | Oluşturma tarihi |

---

### 12. CampaignPlayer (Pivot Tablo)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `campaignId` | String | FK → Campaign |
| `userId` | String | FK → User |
| `characterId` | String | FK → Character (unique) |
| `joinedAt` | DateTime | Katılım tarihi |
| `isActive` | Boolean | Aktif mi? |

**Unique Constraint:** (campaignId, userId)

---

## 🔗 İlişki Diyagramı

```
User ─┬─< Character >─── Campaign
      │         │
      │         └─< InventoryItem
      │
      ├─< Scenario
      │
      └─< CampaignPlayer >─ Campaign
                                │
                                └─< GameSession
                                        │
                                        ├─< Message
                                        ├─< DiceRoll
                                        ├─< NPC
                                        ├─< Combat
                                        └─< Map
```

---

## 🚀 Sonraki Adımlar

1. [ ] Prisma kurulumu
2. [ ] schema.prisma yazımı
3. [ ] Migration oluşturma
4. [ ] Seed data ekleme
