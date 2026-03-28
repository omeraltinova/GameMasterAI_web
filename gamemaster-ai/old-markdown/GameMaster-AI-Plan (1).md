# GameMaster AI - Proje Planı

> 5e SRD tabanlı, yapay zeka destekli dijital oyun yöneticisi (Game Master) uygulaması

---

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Teknoloji Stack](#2-teknoloji-stack)
3. [Roller ve Yetkiler](#3-roller-ve-yetkiler)
4. [Veritabanı Şeması](#4-veritabanı-şeması)
5. [API Endpoints](#5-api-endpoints)
6. [Sayfa Yapısı](#6-sayfa-yapısı)
7. [Component Mimarisi](#7-component-mimarisi)
8. [AI Entegrasyonu](#8-ai-entegrasyonu)
9. [Oyun Mekanikleri](#9-oyun-mekanikleri)
10. [Real-time İletişim](#10-real-time-iletişim)
11. [Geliştirme Fazları](#11-geliştirme-fazları)

---

## 1. Proje Özeti

### 1.1 Amaç

Masa üstü rol yapma oyunlarındaki (TTRPG) Game Master rolünü yapay zeka ile dijitalleştirmek. Oyuncular tek başına veya grupça, AI tarafından yönetilen interaktif hikaye deneyimi yaşayabilecek.

### 1.2 Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| **AI Game Master** | Hikaye anlatımı, NPC diyalogları, olay yönetimi |
| **Karakter Sistemi** | 5e SRD tabanlı karakter oluşturma ve yönetimi |
| **Kampanya Yönetimi** | Tek/çok oyunculu kampanya desteği |
| **Zar Sistemi** | Tüm TTRPG zarları (d4, d6, d8, d10, d12, d20, d100) |
| **Savaş Sistemi** | Turn-based combat, initiative tracking |
| **Envanter** | Item yönetimi, equipment sistemi |
| **Harita Görselleri** | AI ile dinamik harita oluşturma |
| **Senaryo Sistemi** | Hazır + kullanıcı + AI senaryoları |

### 1.3 Oyun Akışı

```
┌─────────────────────────────────────────────────────────────────┐
│                        OYUN AKIŞI                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. HAZIRLIK                                                    │
│     ├── Kullanıcı giriş yapar                                   │
│     ├── Karakter oluşturur/seçer                                │
│     └── Kampanya oluşturur veya katılır                         │
│                                                                 │
│  2. OYUN BAŞLANGICI                                             │
│     ├── Senaryo seçilir (hazır/kullanıcı/AI)                    │
│     ├── AI GM hikayeyi başlatır                                 │
│     └── Oyuncu(lar) aksiyonlarını belirler                      │
│                                                                 │
│  3. OYUN DÖNGÜSÜ                                                │
│     ┌─────────────────────────────────────────┐                 │
│     │  Oyuncu Aksiyonu                        │                 │
│     │         ↓                               │                 │
│     │  AI Değerlendirmesi                     │                 │
│     │         ↓                               │                 │
│     │  Zar Atımı (gerekirse)                  │                 │
│     │         ↓                               │                 │
│     │  Sonuç & Hikaye Devamı                  │                 │
│     │         ↓                               │                 │
│     │  Savaş/NPC Etkileşimi (opsiyonel)       │                 │
│     │         ↓                               │                 │
│     │  State Güncelleme                       │                 │
│     └─────────────────────────────────────────┘                 │
│                                                                 │
│  4. OTURUM SONU                                                 │
│     ├── İlerleme kaydedilir                                     │
│     ├── XP/Loot dağıtılır                                       │
│     └── Sonraki oturum için state saklanır                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Teknoloji Stack

### 2.1 Ana Teknolojiler

| Katman | Teknoloji | Versiyon | Amaç |
|--------|-----------|----------|------|
| **Frontend** | Next.js | 14+ | React framework, App Router |
| **UI Library** | React | 18+ | Component tabanlı UI |
| **Styling** | TailwindCSS | 3+ | Utility-first CSS |
| **Backend** | Next.js API Routes | - | Serverless API |
| **Database** | SQLite | 3+ | Hafif, dosya tabanlı DB |
| **ORM** | Prisma | 5+ | Type-safe DB erişimi |
| **Auth** | NextAuth.js | 4+ | Authentication |
| **AI** | OpenRouter API | - | LLM erişimi |
| **State** | Zustand | 4+ | Client-side state |

### 2.2 Yardımcı Kütüphaneler

| Kütüphane | Amaç |
|-----------|------|
| `bcryptjs` | Şifre hashleme |
| `zod` | Schema validation |
| `lucide-react` | İkonlar |
| `@radix-ui/*` | Headless UI components |
| `date-fns` | Tarih işlemleri |

### 2.3 Geliştirme Araçları

| Araç | Amaç |
|------|------|
| TypeScript | Type safety |
| ESLint | Kod kalitesi |
| Prettier | Kod formatlama |
| Prisma Studio | DB yönetimi |

---

## 3. Roller ve Yetkiler

### 3.1 Rol Tanımları

```
┌──────────────────────────────────────────────────────────────────┐
│                         ROL HİYERARŞİSİ                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                          ┌─────────┐                             │
│                          │  ADMIN  │                             │
│                          └────┬────┘                             │
│                               │                                  │
│                     Tüm yetkiler + Yönetim                       │
│                               │                                  │
│                          ┌────┴────┐                             │
│                          │  MEMBER │                             │
│                          └────┬────┘                             │
│                               │                                  │
│                    Oyun oynama + İçerik oluşturma                │
│                               │                                  │
│                          ┌────┴────┐                             │
│                          │ VISITOR │                             │
│                          └─────────┘                             │
│                               │                                  │
│                     Sadece görüntüleme + Kayıt                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Yetki Matrisi

| İşlem | Visitor | Member | Admin |
|-------|:-------:|:------:|:-----:|
| Ana sayfa görüntüleme | ✅ | ✅ | ✅ |
| Kuralları okuma | ✅ | ✅ | ✅ |
| Demo izleme | ✅ | ✅ | ✅ |
| Kayıt/Giriş | ✅ | ✅ | ✅ |
| **Karakter oluşturma** | ❌ | ✅ | ✅ |
| **Karakter düzenleme** | ❌ | ✅ (kendi) | ✅ |
| **Kampanya oluşturma** | ❌ | ✅ | ✅ |
| **Kampanyaya katılma** | ❌ | ✅ | ✅ |
| **Oyun oynama** | ❌ | ✅ | ✅ |
| **Senaryo oluşturma** | ❌ | ✅ | ✅ |
| **Zar atma** | ❌ | ✅ | ✅ |
| Kullanıcı yönetimi | ❌ | ❌ | ✅ |
| Resmi senaryo yönetimi | ❌ | ❌ | ✅ |
| Sistem istatistikleri | ❌ | ❌ | ✅ |
| İçerik moderasyonu | ❌ | ❌ | ✅ |

### 3.3 Middleware Kontrolü

Yetkilendirme, layout seviyesinde middleware ile kontrol edilir. Her protected route için session ve rol kontrolü yapılır.

---

## 4. Veritabanı Şeması

### 4.1 ER Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ER DİYAGRAMI                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐         ┌─────────────┐         ┌────────────┐           │
│  │   User   │────────<│  Character  │>────────│  Campaign  │           │
│  └──────────┘    1:N  └─────────────┘    N:1  └────────────┘           │
│       │                     │                       │                   │
│       │                     │                       │                   │
│       │ 1:N                 │ 1:N                   │ 1:N               │
│       ▼                     ▼                       ▼                   │
│  ┌──────────┐         ┌─────────────┐         ┌────────────┐           │
│  │ Scenario │         │InventoryItem│         │GameSession │           │
│  └──────────┘         └─────────────┘         └────────────┘           │
│                                                     │                   │
│                                                     │ 1:N               │
│                    ┌────────────────────────────────┼───────────┐       │
│                    │                │               │           │       │
│                    ▼                ▼               ▼           ▼       │
│              ┌──────────┐    ┌──────────┐    ┌──────────┐ ┌─────────┐  │
│              │ Message  │    │ DiceRoll │    │   NPC    │ │   Map   │  │
│              └──────────┘    └──────────┘    └──────────┘ └─────────┘  │
│                                                     │                   │
│                                                     │ 1:N               │
│                                                     ▼                   │
│                                               ┌──────────┐              │
│                                               │  Combat  │              │
│                                               └──────────┘              │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │ CampaignPlayer   │  (User-Campaign M:N ilişkisi için pivot tablo)   │
│  └──────────────────┘                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tablo Detayları

#### User (Kullanıcı)

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

**İlişkiler:** characters (1:N), campaigns (1:N), scenarios (1:N), campaignPlayers (1:N)

---

#### Character (Karakter)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `userId` | String | FK → User |
| `campaignId` | String? | FK → Campaign (aktif kampanya) |
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

**Stats JSON Yapısı:**
```json
{
  "strength": 16,
  "dexterity": 14,
  "constitution": 15,
  "intelligence": 10,
  "wisdom": 12,
  "charisma": 8
}
```

---

#### Campaign (Kampanya)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `name` | String | Kampanya adı |
| `description` | String? | Açıklama |
| `creatorId` | String | FK → User (oluşturan) |
| `scenarioId` | String? | FK → Scenario |
| `isMultiplayer` | Boolean | Çok oyunculu mu? |
| `maxPlayers` | Int | Maksimum oyuncu (default: 4) |
| `inviteCode` | String? | Unique, katılım kodu |
| `status` | Enum | DRAFT, ACTIVE, PAUSED, COMPLETED |
| `createdAt` | DateTime | Oluşturma tarihi |
| `updatedAt` | DateTime | Güncelleme tarihi |

---

#### GameSession (Oyun Oturumu)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `campaignId` | String | FK → Campaign |
| `currentState` | JSON | Mevcut oyun durumu |
| `turnOrder` | JSON? | Sıra listesi (karakter ID'leri) |
| `activePlayer` | String? | Aktif oyuncu ID |
| `aiContext` | Text? | AI için context/memory |
| `createdAt` | DateTime | Başlangıç |
| `updatedAt` | DateTime | Son güncelleme |

**currentState JSON Yapısı:**
```json
{
  "location": "Tavern of the Broken Sword",
  "timeOfDay": "evening",
  "weather": "rainy",
  "activeNPCs": ["Bartender Grom", "Mysterious Stranger"],
  "activeQuests": ["Find the Lost Artifact"],
  "notes": "Party just arrived, tension in the air"
}
```

---

#### Message (Mesaj)

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

#### DiceRoll (Zar Atımı)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `characterId` | String? | FK → Character |
| `diceType` | String | d4, d6, d8, d10, d12, d20, d100 |
| `count` | Int | Zar sayısı |
| `results` | JSON | [3, 5, 2] gibi sonuç dizisi |
| `modifier` | Int | Eklenen/çıkarılan değer |
| `total` | Int | Toplam sonuç |
| `purpose` | String? | "Attack Roll", "Saving Throw" vb. |
| `timestamp` | DateTime | Atım zamanı |

---

#### Scenario (Senaryo)

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
| `tags` | JSON? | ["dungeon", "dragon", "mystery"] |
| `createdAt` | DateTime | Oluşturma tarihi |

---

#### NPC (Non-Player Character)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `sessionId` | String | FK → GameSession |
| `name` | String | NPC adı |
| `race` | String? | Irk |
| `role` | String | Merchant, Guard, Villain... |
| `personality` | Text? | Kişilik özellikleri |
| `stats` | JSON? | Basit stat bloğu |
| `isHostile` | Boolean | Düşman mı? |
| `dialogue` | JSON? | Diyalog geçmişi |
| `imageUrl` | String? | NPC görseli |
| `createdAt` | DateTime | Oluşturma tarihi |

---

#### Combat (Savaş)

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

**participants JSON Yapısı:**
```json
[
  {"id": "char_1", "type": "player", "name": "Borin", "initiative": 18, "hp": 45, "maxHp": 45, "ac": 16},
  {"id": "npc_1", "type": "enemy", "name": "Goblin", "initiative": 12, "hp": 7, "maxHp": 7, "ac": 13}
]
```

---

#### InventoryItem (Envanter Öğesi)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | String (CUID) | Primary Key |
| `characterId` | String | FK → Character |
| `name` | String | Item adı |
| `type` | String | Weapon, Armor, Potion, Misc... |
| `description` | String? | Açıklama |
| `quantity` | Int | Miktar |
| `properties` | JSON? | Özellikler (damage, AC bonus...) |
| `equipped` | Boolean | Kuşanılmış mı? |
| `weight` | Float | Ağırlık (lb) |

---

#### Map (Harita)

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

#### CampaignPlayer (Kampanya-Oyuncu İlişkisi)

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

## 5. API Endpoints

### 5.1 Authentication

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `POST` | `/api/auth/register` | Yeni kullanıcı kaydı | Public |
| `POST` | `/api/auth/login` | Giriş yap | Public |
| `POST` | `/api/auth/logout` | Çıkış yap | Member+ |
| `GET` | `/api/auth/me` | Mevcut kullanıcı bilgisi | Member+ |
| `PUT` | `/api/auth/password` | Şifre değiştir | Member+ |

### 5.2 Users (Admin)

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/users` | Tüm kullanıcılar (paginated) | Admin |
| `GET` | `/api/users/:id` | Kullanıcı detayı | Admin |
| `PUT` | `/api/users/:id` | Kullanıcı güncelle | Admin |
| `DELETE` | `/api/users/:id` | Kullanıcı sil | Admin |
| `PUT` | `/api/users/:id/role` | Rol değiştir | Admin |

### 5.3 Characters

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/characters` | Kullanıcının karakterleri | Member+ |
| `POST` | `/api/characters` | Yeni karakter oluştur | Member+ |
| `GET` | `/api/characters/:id` | Karakter detayı | Owner |
| `PUT` | `/api/characters/:id` | Karakter güncelle | Owner |
| `DELETE` | `/api/characters/:id` | Karakter sil | Owner |
| `PUT` | `/api/characters/:id/levelup` | Seviye atla | Owner |
| `PUT` | `/api/characters/:id/hp` | HP güncelle | Owner |

### 5.4 Inventory

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/characters/:id/inventory` | Envanter listesi | Owner |
| `POST` | `/api/characters/:id/inventory` | Item ekle | Owner |
| `PUT` | `/api/characters/:charId/inventory/:itemId` | Item güncelle | Owner |
| `DELETE` | `/api/characters/:charId/inventory/:itemId` | Item sil | Owner |
| `PUT` | `/api/characters/:charId/inventory/:itemId/equip` | Kuşan/Çıkar | Owner |

### 5.5 Campaigns

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/campaigns` | Kullanıcının kampanyaları | Member+ |
| `POST` | `/api/campaigns` | Yeni kampanya | Member+ |
| `GET` | `/api/campaigns/:id` | Kampanya detayı | Player/Owner |
| `PUT` | `/api/campaigns/:id` | Kampanya güncelle | Owner |
| `DELETE` | `/api/campaigns/:id` | Kampanya sil | Owner |
| `POST` | `/api/campaigns/:id/start` | Kampanyayı başlat | Owner |
| `POST` | `/api/campaigns/:id/join` | Kampanyaya katıl | Member+ |
| `POST` | `/api/campaigns/:id/leave` | Ayrıl | Player |
| `GET` | `/api/campaigns/join/:inviteCode` | Davet ile katıl | Member+ |
| `POST` | `/api/campaigns/:id/invite` | Yeni davet kodu | Owner |

### 5.6 Game Sessions

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `POST` | `/api/campaigns/:id/sessions` | Yeni session başlat | Owner |
| `GET` | `/api/sessions/:id` | Session detayı | Player |
| `PUT` | `/api/sessions/:id` | Session güncelle | Player |
| `GET` | `/api/sessions/:id/state` | Oyun durumu (polling) | Player |
| `GET` | `/api/sessions/:id/messages` | Mesaj geçmişi | Player |
| `POST` | `/api/sessions/:id/messages` | Mesaj gönder | Player |
| `GET` | `/api/sessions/:id/updates` | Son güncellemeler (polling) | Player |

### 5.7 AI Game Master

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `POST` | `/api/gm/narrate` | Hikaye devam ettir | Player |
| `POST` | `/api/gm/npc-dialogue` | NPC konuşması | Player |
| `POST` | `/api/gm/generate-map` | Harita görseli oluştur | Player |
| `POST` | `/api/gm/generate-scenario` | AI senaryo oluştur | Member+ |
| `POST` | `/api/gm/combat-action` | Savaş aksiyonu yorumla | Player |
| `POST` | `/api/gm/describe-location` | Lokasyon betimle | Player |

### 5.8 Dice

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `POST` | `/api/dice/roll` | Zar at | Member+ |
| `POST` | `/api/dice/roll-check` | Ability check at | Member+ |
| `POST` | `/api/dice/roll-attack` | Saldırı zarı | Player |
| `POST` | `/api/dice/roll-damage` | Hasar zarı | Player |
| `GET` | `/api/sessions/:id/dice-history` | Zar geçmişi | Player |

### 5.9 Combat

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `POST` | `/api/sessions/:id/combat/start` | Savaş başlat | Player |
| `GET` | `/api/combat/:id` | Savaş durumu | Player |
| `POST` | `/api/combat/:id/action` | Aksiyon yap | Player |
| `POST` | `/api/combat/:id/next-turn` | Sonraki tur | Player |
| `POST` | `/api/combat/:id/end` | Savaş bitir | Player |

### 5.10 Scenarios

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/scenarios` | Tüm senaryolar | Member+ |
| `GET` | `/api/scenarios/official` | Resmi senaryolar | Member+ |
| `GET` | `/api/scenarios/mine` | Kullanıcının senaryoları | Member+ |
| `POST` | `/api/scenarios` | Yeni senaryo | Member+ |
| `GET` | `/api/scenarios/:id` | Senaryo detayı | Member+ |
| `PUT` | `/api/scenarios/:id` | Senaryo güncelle | Owner/Admin |
| `DELETE` | `/api/scenarios/:id` | Senaryo sil | Owner/Admin |

### 5.11 Admin

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/admin/stats` | Sistem istatistikleri | Admin |
| `GET` | `/api/admin/users` | Kullanıcı listesi | Admin |
| `GET` | `/api/admin/campaigns` | Tüm kampanyalar | Admin |
| `GET` | `/api/admin/scenarios` | Tüm senaryolar | Admin |
| `PUT` | `/api/admin/scenarios/:id/official` | Resmi yap/kaldır | Admin |

### 5.12 Maps

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/sessions/:id/maps` | Session haritaları | Player |
| `POST` | `/api/sessions/:id/maps` | Harita ekle | Player |
| `DELETE` | `/api/maps/:id` | Harita sil | Player |

### 5.13 NPCs

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| `GET` | `/api/sessions/:id/npcs` | Session NPC'leri | Player |
| `POST` | `/api/sessions/:id/npcs` | NPC oluştur | Player |
| `PUT` | `/api/npcs/:id` | NPC güncelle | Player |
| `DELETE` | `/api/npcs/:id` | NPC sil | Player |

---

## 6. Sayfa Yapısı

### 6.1 Route Organizasyonu

```
app/
│
├── (public)/                      # Herkese açık sayfalar
│   ├── page.tsx                   # Landing page
│   ├── about/page.tsx             # Hakkında
│   ├── rules/page.tsx             # 5e SRD kuralları
│   └── demo/page.tsx              # Demo/Tanıtım
│
├── (auth)/                        # Auth sayfaları
│   ├── login/page.tsx             # Giriş
│   └── register/page.tsx          # Kayıt
│
├── (protected)/                   # Üye+ erişim (layout'ta guard)
│   ├── layout.tsx                 # Auth kontrolü
│   ├── dashboard/page.tsx         # Ana dashboard
│   │
│   ├── characters/
│   │   ├── page.tsx               # Karakter listesi
│   │   ├── new/page.tsx           # Yeni karakter wizard
│   │   └── [id]/
│   │       ├── page.tsx           # Karakter sheet
│   │       ├── edit/page.tsx      # Düzenleme
│   │       └── inventory/page.tsx # Envanter
│   │
│   ├── campaigns/
│   │   ├── page.tsx               # Kampanya listesi
│   │   ├── new/page.tsx           # Yeni kampanya
│   │   ├── join/page.tsx          # Katılma sayfası
│   │   └── [id]/
│   │       ├── page.tsx           # Kampanya lobby
│   │       ├── settings/page.tsx  # Kampanya ayarları
│   │       └── play/page.tsx      # 🎮 ANA OYUN EKRANI
│   │
│   ├── scenarios/
│   │   ├── page.tsx               # Senaryo listesi
│   │   ├── new/page.tsx           # Yeni senaryo
│   │   └── [id]/page.tsx          # Senaryo detay
│   │
│   └── profile/page.tsx           # Profil ayarları
│
├── (admin)/                       # Admin erişim
│   ├── layout.tsx                 # Admin kontrolü
│   └── admin/
│       ├── page.tsx               # Admin dashboard
│       ├── users/page.tsx         # Kullanıcı yönetimi
│       ├── scenarios/page.tsx     # Senaryo yönetimi
│       └── stats/page.tsx         # İstatistikler
│
└── api/                           # API Routes
    └── [tüm endpointler]
```

### 6.2 Sayfa Açıklamaları

#### Public Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| **Landing** | Hero section, özellikler, nasıl çalışır, CTA |
| **About** | Proje hakkında bilgi |
| **Rules** | 5e SRD temel kuralları özeti |
| **Demo** | Etkileşimli demo veya video tanıtım |

#### Auth Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| **Login** | Email/şifre ile giriş formu |
| **Register** | Kayıt formu (email, username, şifre) |

#### Protected Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| **Dashboard** | Özet: son kampanyalar, karakterler, hızlı erişim |
| **Characters** | Karakter kartları grid'i |
| **Character Detail** | Tam character sheet görünümü |
| **Character Edit** | Form ile düzenleme |
| **Inventory** | Grid tabanlı envanter yönetimi |
| **Campaigns** | Kampanya kartları, filtreler |
| **Campaign Lobby** | Oyuncular, karakter seçimi, başlat butonu |
| **Campaign Play** | 🎮 Ana oyun arayüzü |
| **Scenarios** | Senaryo kartları, arama, filtre |
| **Profile** | Kullanıcı ayarları |

#### Admin Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| **Admin Dashboard** | Genel istatistikler, son aktiviteler |
| **User Management** | Kullanıcı tablosu, rol değiştirme, silme |
| **Scenario Management** | Tüm senaryolar, resmi yapma/kaldırma |
| **Stats** | Detaylı grafikler ve metrikler |

---

## 7. Component Mimarisi

### 7.1 Klasör Yapısı

```
components/
│
├── ui/                    # Temel UI primitifleri
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Dropdown.tsx
│   ├── Tabs.tsx
│   ├── Toast.tsx
│   ├── Spinner.tsx
│   ├── Progress.tsx
│   └── Tooltip.tsx
│
├── layout/                # Layout bileşenleri
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── Navigation.tsx
│   ├── MobileMenu.tsx
│   └── AuthGuard.tsx
│
├── auth/                  # Auth bileşenleri
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── UserMenu.tsx
│
├── character/             # Karakter bileşenleri
│   ├── CharacterCard.tsx
│   ├── CharacterSheet.tsx
│   ├── CharacterCreator/
│   │   ├── index.tsx          # Wizard container
│   │   ├── RaceSelector.tsx
│   │   ├── ClassSelector.tsx
│   │   ├── StatsRoller.tsx
│   │   ├── BackgroundPicker.tsx
│   │   └── CharacterPreview.tsx
│   ├── StatsDisplay.tsx
│   ├── HealthBar.tsx
│   ├── ExperienceBar.tsx
│   └── AbilityScores.tsx
│
├── inventory/             # Envanter bileşenleri
│   ├── InventoryGrid.tsx
│   ├── ItemCard.tsx
│   ├── ItemDetail.tsx
│   ├── EquipmentSlots.tsx
│   └── AddItemModal.tsx
│
├── campaign/              # Kampanya bileşenleri
│   ├── CampaignCard.tsx
│   ├── CampaignLobby.tsx
│   ├── PlayerList.tsx
│   ├── InviteCode.tsx
│   ├── JoinForm.tsx
│   └── CampaignSettings.tsx
│
├── game/                  # 🎮 Oyun bileşenleri
│   ├── GameInterface/
│   │   ├── index.tsx          # Ana container
│   │   ├── GameHeader.tsx     # Kampanya bilgisi, çıkış
│   │   ├── NarrativePanel.tsx # GM hikaye alanı
│   │   ├── ActionPanel.tsx    # Oyuncu aksiyon girişi
│   │   └── SidePanel.tsx      # Karakter/envanter özet
│   │
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── TypingIndicator.tsx
│   │
│   ├── dice/
│   │   ├── DiceRoller.tsx     # Ana zar arayüzü
│   │   ├── DiceButton.tsx     # Tek zar butonu
│   │   ├── DiceAnimation.tsx  # Zar animasyonu
│   │   ├── DiceResult.tsx     # Sonuç gösterimi
│   │   └── DiceHistory.tsx    # Geçmiş atımlar
│   │
│   ├── combat/
│   │   ├── CombatTracker.tsx  # Ana savaş arayüzü
│   │   ├── InitiativeOrder.tsx
│   │   ├── CombatActions.tsx
│   │   ├── TargetSelector.tsx
│   │   ├── CombatLog.tsx
│   │   └── TurnIndicator.tsx
│   │
│   ├── map/
│   │   ├── MapViewer.tsx
│   │   ├── MapGenerator.tsx
│   │   └── MapGallery.tsx
│   │
│   └── npc/
│       ├── NPCCard.tsx
│       ├── NPCDialogue.tsx
│       └── NPCList.tsx
│
├── scenario/              # Senaryo bileşenleri
│   ├── ScenarioCard.tsx
│   ├── ScenarioCreator.tsx
│   ├── ScenarioDetail.tsx
│   └── AIScenarioGenerator.tsx
│
└── admin/                 # Admin bileşenleri
    ├── UserTable.tsx
    ├── StatsCards.tsx
    ├── StatsCharts.tsx
    ├── ScenarioManager.tsx
    └── ActivityLog.tsx
```

### 7.2 Component Hiyerarşisi (Oyun Ekranı)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GameInterface                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       GameHeader                               │  │
│  │  [Kampanya Adı]              [Oyuncular]        [Ayarlar] [X]  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────┐ ┌─────────────────────────┐   │
│  │        NarrativePanel           │ │      SidePanel          │   │
│  │  ┌───────────────────────────┐  │ │  ┌───────────────────┐  │   │
│  │  │      ChatWindow           │  │ │  │  CharacterMini    │  │   │
│  │  │  ┌─────────────────────┐  │  │ │  │  - HP Bar         │  │   │
│  │  │  │  MessageBubble (GM) │  │  │ │  │  - Stats          │  │   │
│  │  │  └─────────────────────┘  │  │ │  └───────────────────┘  │   │
│  │  │  ┌─────────────────────┐  │  │ │  ┌───────────────────┐  │   │
│  │  │  │ MessageBubble (You) │  │  │ │  │  QuickInventory   │  │   │
│  │  │  └─────────────────────┘  │  │ │  └───────────────────┘  │   │
│  │  │  ┌─────────────────────┐  │  │ │  ┌───────────────────┐  │   │
│  │  │  │   DiceResult        │  │  │ │  │   DiceRoller      │  │   │
│  │  │  └─────────────────────┘  │  │ │  │  [d4][d6][d8]...  │  │   │
│  │  └───────────────────────────┘  │ │  └───────────────────┘  │   │
│  └─────────────────────────────────┘ └─────────────────────────┘   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       ActionPanel                              │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    MessageInput                          │  │  │
│  │  │  [Aksiyonunu yaz...                              ] [Gönder]│  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  [Zar At] [Envanter] [Harita] [NPC'ler] [Savaş]               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    CombatTracker (conditional)                 │  │
│  │  Round 3  |  Initiative: [Borin*] → Goblin → Elara → Orc     │  │
│  │  [Attack] [Spell] [Dodge] [Disengage] [End Turn]              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. AI Entegrasyonu

### 8.1 OpenRouter API Yapısı

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI SİSTEM MİMARİSİ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Client                    Server                  OpenRouter  │
│     │                         │                         │       │
│     │  Oyuncu aksiyonu        │                         │       │
│     │────────────────────────▶│                         │       │
│     │                         │                         │       │
│     │                         │  Context + Prompt       │       │
│     │                         │────────────────────────▶│       │
│     │                         │                         │       │
│     │                         │  AI Response            │       │
│     │                         │◀────────────────────────│       │
│     │                         │                         │       │
│     │  GM Narration           │                         │       │
│     │◀────────────────────────│                         │       │
│     │                         │                         │       │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Kullanılan Modeller

| Görev | Model Önerisi | Amaç |
|-------|---------------|------|
| **Hikaye Anlatımı** | Claude 3 Sonnet / GPT-4 | Detaylı, tutarlı narratif |
| **NPC Diyalog** | Claude 3 Haiku / GPT-3.5 | Hızlı, kısa yanıtlar |
| **Senaryo Üretimi** | Claude 3 Sonnet | Yaratıcı içerik |
| **Harita Görseli** | DALL-E 3 / Stable Diffusion | Görsel üretim |

### 8.3 Prompt Kategorileri

#### System Prompt (GM Rolü)

GM'in temel davranışını belirler: 5e SRD kuralları, anlatım tarzı, NPC yönetimi, zar isteme formatı

#### Context Prompt

Her istekte gönderilen dinamik bilgiler: mevcut durum, karakter bilgileri, son olaylar, aktif NPC'ler

#### Task-Specific Prompts

| Prompt Tipi | Amaç |
|-------------|------|
| Narration | Hikaye devam ettirme |
| NPC Dialogue | Belirli NPC'nin konuşması |
| Combat Description | Savaş aksiyonu sonucu |
| Location Description | Yeni lokasyon betimlemesi |
| Scenario Generation | Yeni senaryo oluşturma |

### 8.4 Context Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT YAPISI                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   SYSTEM PROMPT                         │    │
│  │  - GM rolü tanımı                                       │    │
│  │  - 5e SRD kuralları özeti                               │    │
│  │  - Format kuralları                                     │    │
│  │  - Davranış sınırları                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                           +                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   GAME CONTEXT                          │    │
│  │  - Senaryo bilgisi                                      │    │
│  │  - Mevcut lokasyon                                      │    │
│  │  - Aktif NPC'ler                                        │    │
│  │  - Oyuncu karakter(ler)i                                │    │
│  │  - Son 10-20 mesaj özeti                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                           +                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   USER MESSAGE                          │    │
│  │  - Oyuncunun aksiyonu                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                           =                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   AI RESPONSE                           │    │
│  │  - Hikaye devamı                                        │    │
│  │  - Zar gereksinimleri                                   │    │
│  │  - NPC tepkileri                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Oyun Mekanikleri

### 9.1 Zar Sistemi

#### Desteklenen Zarlar

| Zar | Kullanım Alanları |
|-----|-------------------|
| `d4` | Küçük silah hasarı, minor healing |
| `d6` | Orta silah hasarı, fireball, sneak attack |
| `d8` | Longsword, çoğu silah hasarı |
| `d10` | Heavy silahlar, cantrip damage |
| `d12` | Greataxe, barbarian hit die |
| `d20` | Tüm checkler, attack roll, saving throw |
| `d100` | Percentile, wild magic, random tablolar |

#### Roll Tipleri

| Tip | Açıklama | Formül |
|-----|----------|--------|
| **Ability Check** | Skill/ability kullanımı | d20 + ability mod + proficiency |
| **Attack Roll** | Saldırı | d20 + attack bonus |
| **Saving Throw** | Kurtulma | d20 + save mod |
| **Damage Roll** | Hasar | Silaha göre (ör: 2d6+3) |
| **Initiative** | Savaş sırası | d20 + DEX mod |
| **Advantage** | Avantajlı atış | 2d20, yüksek olanı al |
| **Disadvantage** | Dezavantajlı | 2d20, düşük olanı al |

#### Kritik Sonuçlar

| Sonuç | Durum | Etki |
|-------|-------|------|
| Natural 20 | Kritik başarı | Otomatik isabet, çift hasar zarı |
| Natural 1 | Kritik başarısızlık | Otomatik ıskalama |

### 9.2 Combat Sistemi

#### Savaş Akışı

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAVAŞ AKIŞI                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SAVAŞ BAŞLANGICI                                            │
│     ├── Tüm katılımcılar belirlenir                             │
│     ├── Herkes Initiative atar (d20 + DEX)                      │
│     └── Turn order belirlenir (yüksekten düşüğe)                │
│                                                                 │
│  2. ROUND DÖNGÜSÜ                                               │
│     ┌─────────────────────────────────────────────┐             │
│     │  Her karakter sırayla:                      │             │
│     │                                             │             │
│     │  ACTION (1 adet)                            │             │
│     │  ├── Attack                                 │             │
│     │  ├── Cast Spell                             │             │
│     │  ├── Dash (ekstra hareket)                  │             │
│     │  ├── Dodge (dezavantaj ver)                 │             │
│     │  ├── Disengage (opportunity attack yok)     │             │
│     │  ├── Help                                   │             │
│     │  ├── Hide                                   │             │
│     │  └── Use Object                             │             │
│     │                                             │             │
│     │  BONUS ACTION (varsa)                       │             │
│     │  ├── Offhand attack                         │             │
│     │  ├── Bazı speller                           │             │
│     │  └── Class özellikleri                      │             │
│     │                                             │             │
│     │  MOVEMENT (speed kadar)                     │             │
│     │  └── Genelde 30 feet                        │             │
│     │                                             │             │
│     │  REACTION (1 adet, başkasının turunda)      │             │
│     │  └── Opportunity Attack, Shield spell, vb.  │             │
│     └─────────────────────────────────────────────┘             │
│                                                                 │
│  3. SAVAŞ SONU                                                  │
│     ├── Tüm düşmanlar yenildi                                   │
│     ├── Oyuncular yenildi                                       │
│     ├── Kaçış/teslim olma                                       │
│     └── XP ve loot dağıtımı                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Attack Resolution

```
SALDIRI ÇÖZÜMLEME:

1. Attack Roll: d20 + attack bonus
   ├── >= Target AC → İSABET
   ├── < Target AC → ISKALA
   ├── Natural 20 → KRİTİK İSABET
   └── Natural 1 → KRİTİK ISKALA

2. Damage Roll (isabet durumunda):
   ├── Normal: damage dice + modifier
   └── Kritik: (damage dice × 2) + modifier
```

### 9.3 Karakter İstatistikleri

#### Ability Scores

| Ability | Kısaltma | Etki Alanları |
|---------|----------|---------------|
| Strength | STR | Melee attack, carry capacity, Athletics |
| Dexterity | DEX | Ranged attack, AC, Initiative, Acrobatics, Stealth |
| Constitution | CON | HP, Concentration saves |
| Intelligence | INT | Arcana, History, Investigation, Nature, Religion |
| Wisdom | WIS | Animal Handling, Insight, Medicine, Perception, Survival |
| Charisma | CHA | Deception, Intimidation, Performance, Persuasion |

#### Modifier Hesaplama

```
Modifier = (Ability Score - 10) / 2 (aşağı yuvarla)

Örnek:
- Score 8  → Modifier -1
- Score 10 → Modifier 0
- Score 14 → Modifier +2
- Score 18 → Modifier +4
- Score 20 → Modifier +5
```

#### Proficiency Bonus

| Level | Bonus |
|-------|-------|
| 1-4 | +2 |
| 5-8 | +3 |
| 9-12 | +4 |
| 13-16 | +5 |
| 17-20 | +6 |

### 9.4 Envanter Sistemi

#### Item Kategorileri

| Kategori | Örnekler |
|----------|----------|
| **Weapons** | Sword, Bow, Staff, Dagger |
| **Armor** | Chain Mail, Leather, Shield |
| **Potions** | Healing, Invisibility, Strength |
| **Scrolls** | Spell scrolls |
| **Tools** | Thieves' tools, Herbalism kit |
| **Misc** | Rope, Torch, Rations |
| **Quest Items** | Anahtarlar, haritalar, özel objeler |

#### Equipment Slots

```
┌─────────────────────────────────────┐
│         EQUIPMENT SLOTS             │
├─────────────────────────────────────┤
│                                     │
│  HEAD      →  [Helmet/Hat]          │
│  NECK      →  [Amulet/Necklace]     │
│  BODY      →  [Armor]               │
│  HANDS     →  [Gloves]              │
│  FINGER 1  →  [Ring]                │
│  FINGER 2  →  [Ring]                │
│  FEET      →  [Boots]               │
│  MAIN HAND →  [Weapon/Shield]       │
│  OFF HAND  →  [Weapon/Shield/Item]  │
│                                     │
│  BACKPACK  →  [Genel envanter]      │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. Real-time İletişim

### 10.1 Polling Yaklaşımı (Mevcut Seçim)

```
┌─────────────────────────────────────────────────────────────────┐
│                     POLLING MİMARİSİ                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   TEK OYUNCULU:                                                 │
│   └── Polling KULLANILMAZ                                       │
│       - Sadece API call → Response döngüsü                      │
│       - Real-time gereksiz (sadece sen ve AI)                   │
│                                                                 │
│   ÇOK OYUNCULU:                                                 │
│   └── Polling ile senkronizasyon                                │
│                                                                 │
│       Client A        Server         Client B                   │
│          │               │               │                      │
│          │  GET /state   │               │                      │
│          │──────────────▶│               │                      │
│          │◀──────────────│               │                      │
│          │               │  GET /state   │                      │
│          │               │◀──────────────│                      │
│          │               │──────────────▶│                      │
│          │               │               │                      │
│          │     (2-3 saniye sonra)        │                      │
│          │               │               │                      │
│          │  GET /updates │               │                      │
│          │──────────────▶│               │                      │
│          │◀──────────────│               │                      │
│          │               │               │                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Polling Endpoints

| Endpoint | Interval | Amaç |
|----------|----------|------|
| `GET /api/sessions/:id/state` | İlk yükleme | Tam oyun durumu |
| `GET /api/sessions/:id/updates?since=timestamp` | 2-3 saniye | Delta güncellemeler |

### 10.3 Gelecekte: Socket.io (Local Development)

Eğer local'de çalışılacak ve tam real-time isteniyorsa, ayrı bir Socket server eklenebilir.

#### Socket Events

| Event | Yön | Açıklama |
|-------|-----|----------|
| `join-campaign` | C→S | Kampanyaya katıl |
| `leave-campaign` | C→S | Kampanyadan ayrıl |
| `player-joined` | S→C | Oyuncu katıldı bildirimi |
| `player-left` | S→C | Oyuncu ayrıldı bildirimi |
| `send-message` | C→S | Mesaj gönder |
| `new-message` | S→C | Yeni mesaj bildirimi |
| `roll-dice` | C→S | Zar at |
| `dice-rolled` | S→C | Zar sonucu |
| `gm-narration` | S→C | AI GM yanıtı |
| `combat-update` | S→C | Savaş durumu değişti |
| `turn-change` | S→C | Sıra değişti |

---

## 11. Geliştirme Fazları

### 11.1 Faz Özeti

| Faz | Süre | Odak |
|-----|------|------|
| **Faz 1** | 1-2 hafta | Temel Altyapı |
| **Faz 2** | 1-2 hafta | Kullanıcı & Karakter |
| **Faz 3** | 1-2 hafta | Kampanya Sistemi |
| **Faz 4** | 2-3 hafta | Oyun Mekanikleri |
| **Faz 5** | 2-3 hafta | AI Entegrasyonu |
| **Faz 6** | 1-2 hafta | Polish & Test |

### 11.2 Faz 1: Temel Altyapı

**Hedef:** Projenin iskeletini kurmak

**Görevler:**
- [ ] Next.js 14 proje kurulumu (App Router)
- [ ] TailwindCSS konfigürasyonu
- [ ] Prisma kurulumu ve SQLite bağlantısı
- [ ] Veritabanı şeması (tüm tablolar)
- [ ] `prisma migrate` ile migration
- [ ] NextAuth.js kurulumu (Credentials provider)
- [ ] Temel UI componentleri (Button, Input, Card, Modal)
- [ ] Layout yapısı (Header, Footer, Sidebar)
- [ ] Auth middleware (protected routes)
- [ ] Role-based access control

**Çıktılar:**
- Çalışan boş proje
- Giriş/kayıt sistemi
- Rol bazlı route koruması

### 11.3 Faz 2: Kullanıcı & Karakter

**Hedef:** Karakter oluşturma ve yönetim sistemi

**Görevler:**
- [ ] Kayıt sayfası
- [ ] Giriş sayfası
- [ ] Profil sayfası
- [ ] Karakter listesi sayfası
- [ ] Karakter oluşturma wizard
  - [ ] Irk seçimi (Human, Elf, Dwarf, vb.)
  - [ ] Sınıf seçimi (Fighter, Wizard, Rogue, vb.)
  - [ ] Stat rolling (4d6 drop lowest)
  - [ ] Background seçimi
  - [ ] İsim ve görsel
- [ ] Karakter sheet görüntüleme
- [ ] Karakter düzenleme
- [ ] Karakter silme
- [ ] Karakter API endpoints

**Çıktılar:**
- Tam fonksiyonel karakter sistemi
- 5e SRD uyumlu stat sistemi

### 11.4 Faz 3: Kampanya Sistemi

**Hedef:** Kampanya oluşturma ve çok oyunculu altyapı

**Görevler:**
- [ ] Kampanya listesi sayfası
- [ ] Kampanya oluşturma formu
- [ ] Senaryo sistemi
  - [ ] Hazır senaryo listesi
  - [ ] Kullanıcı senaryo oluşturma
  - [ ] Senaryo seçim arayüzü
- [ ] Kampanya lobby sayfası
- [ ] Davet kodu sistemi
- [ ] Kampanyaya katılma akışı
- [ ] Oyuncu listesi görüntüleme
- [ ] Karakter seçimi (kampanya için)
- [ ] Kampanya başlatma
- [ ] Kampanya API endpoints

**Çıktılar:**
- Tek ve çok oyunculu kampanya desteği
- Davet sistemi
- Senaryo altyapısı

### 11.5 Faz 4: Oyun Mekanikleri

**Hedef:** Core gameplay sistemleri

**Görevler:**
- [ ] Zar sistemi
  - [ ] Tüm zar tipleri (d4-d100)
  - [ ] Modifier desteği
  - [ ] Advantage/Disadvantage
  - [ ] Zar animasyonu
  - [ ] Zar geçmişi
- [ ] Envanter sistemi
  - [ ] Item CRUD
  - [ ] Equipment slots
  - [ ] Kuşanma/çıkarma
  - [ ] Ağırlık hesaplama
- [ ] Combat sistemi
  - [ ] Initiative roller
  - [ ] Turn order tracker
  - [ ] Attack/damage hesaplama
  - [ ] HP tracking
  - [ ] Combat log
- [ ] Game session yönetimi
- [ ] Message sistemi (player ↔ GM)

**Çıktılar:**
- Tam fonksiyonel zar sistemi
- Çalışan savaş mekaniği
- Envanter yönetimi

### 11.6 Faz 5: AI Entegrasyonu

**Hedef:** AI Game Master'ı hayata geçirmek

**Görevler:**
- [ ] OpenRouter API entegrasyonu
- [ ] System prompt tasarımı (GM rolü)
- [ ] Context management sistemi
- [ ] Hikaye anlatımı (narration)
- [ ] NPC diyalog sistemi
- [ ] NPC kişilik ve tutum yönetimi
- [ ] Zar isteme mekanizması
- [ ] AI senaryo oluşturucu
- [ ] Harita görseli oluşturma (DALL-E)
- [ ] Combat aksiyon yorumlama
- [ ] Error handling ve fallback

**Çıktılar:**
- Çalışan AI Game Master
- Dinamik hikaye anlatımı
- Görsel içerik üretimi

### 11.7 Faz 6: Polish & Test

**Hedef:** Projeyi tamamlamak ve test etmek

**Görevler:**
- [ ] Admin dashboard
  - [ ] Kullanıcı yönetimi
  - [ ] Senaryo moderasyonu
  - [ ] İstatistikler
- [ ] Çok oyunculu polling sistemi
- [ ] UI/UX iyileştirmeleri
- [ ] Responsive tasarım kontrolü
- [ ] Error boundary'ler
- [ ] Loading state'ler
- [ ] Toast notifications
- [ ] Bug fixing
- [ ] Performance optimizasyonu
- [ ] Seed data (başlangıç senaryoları)
- [ ] Dokümantasyon

**Çıktılar:**
- Production-ready uygulama
- Admin paneli
- Test edilmiş sistem

---

## 📁 Proje Dosya Yapısı

```
gamemaster-ai/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── about/page.tsx
│   │   ├── rules/page.tsx
│   │   └── demo/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── characters/
│   │   ├── campaigns/
│   │   ├── scenarios/
│   │   └── profile/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   └── admin/
│   ├── api/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── characters/
│   │   ├── campaigns/
│   │   ├── sessions/
│   │   ├── scenarios/
│   │   ├── gm/
│   │   ├── dice/
│   │   ├── combat/
│   │   └── admin/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── auth/
│   ├── character/
│   ├── inventory/
│   ├── campaign/
│   ├── game/
│   ├── scenario/
│   └── admin/
│
├── lib/
│   ├── ai/
│   │   ├── openrouter.ts
│   │   ├── prompts.ts
│   │   └── context.ts
│   ├── dice/
│   │   └── roller.ts
│   ├── combat/
│   │   └── manager.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── auth/
│   │   └── options.ts
│   ├── validators/
│   │   └── schemas.ts
│   └── utils/
│       └── helpers.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useGame.ts
│   ├── useDice.ts
│   ├── usePolling.ts
│   └── useCombat.ts
│
├── store/
│   └── gameStore.ts
│
├── types/
│   ├── index.ts
│   ├── character.ts
│   ├── campaign.ts
│   ├── game.ts
│   └── combat.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── public/
│   ├── images/
│   │   ├── races/
│   │   ├── classes/
│   │   └── items/
│   └── sounds/
│       └── dice/
│
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🚀 Başlangıç Komutları

```bash
# Proje oluşturma
npx create-next-app@latest gamemaster-ai --typescript --tailwind --app --eslint

# Dizine geç
cd gamemaster-ai

# Temel bağımlılıklar
npm install @prisma/client next-auth bcryptjs zod zustand
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs @radix-ui/react-tooltip
npm install lucide-react date-fns

# Dev bağımlılıklar
npm install -D prisma @types/bcryptjs

# Prisma kurulum
npx prisma init --datasource-provider sqlite

# Migration (schema.prisma düzenlendikten sonra)
npx prisma migrate dev --name init

# Prisma client oluştur
npx prisma generate

# Seed data (opsiyonel)
npx prisma db seed
```

---

## 📝 Notlar

### Önemli Kararlar

1. **Polling vs WebSocket:** Eğitim projesi için polling yeterli. Daha sonra Socket.io eklenebilir.

2. **SQLite:** Hafif, dosya tabanlı, development için ideal. Production'da PostgreSQL'e geçilebilir.

3. **5e SRD:** Açık lisanslı içerik (CC-BY-4.0) kullanılacak. SRD dışı içerik telif sorunu yaratabilir.

4. **AI Model Seçimi:** OpenRouter üzerinden farklı modeller test edilebilir. Maliyet/kalite dengesine göre seçim yapılmalı.

### Gelecek Geliştirmeler

- [ ] Karakter portre üretimi (AI)
- [ ] Ses efektleri
- [ ] Müzik entegrasyonu
- [ ] Token tabanlı harita sistemi
- [ ] Spell book yönetimi
- [ ] Level up wizard
- [ ] Party loot paylaşımı
- [ ] Campaign export/import

---

*Son Güncelleme: Aralık 2024*
