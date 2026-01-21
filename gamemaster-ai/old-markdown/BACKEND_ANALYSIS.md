# Backend Durum Analizi - GameMaster AI

## 📊 Genel Bakış

Bu analiz, mevcut backend durumunu ve AI özellikleri için gerekli olan eksik kısımları özetlemektedir.

---

## ✅ Tamamlanmış Backend Özellikleri

### 1. Veritabanı Şeması (Prisma)
- ✅ Tüm tablolar tanımlanmış (User, Character, Campaign, GameSession, Message, DiceRoll, Scenario, NPC, Combat, InventoryItem, Map, CampaignPlayer)
- ✅ İlişkiler doğru kurulmuş
- ✅ SQLite veritabanı bağlantısı hazır
- ✅ Migration uygulanmış

### 2. Authentication Sistemi
- ✅ NextAuth.js kurulumu tamamlandı
- ✅ Credentials provider yapılandırılmış
- ✅ Login API endpoint (`/api/login`)
- ✅ Register API endpoint (`/api/register`)
- ✅ Şifre hashleme (bcryptjs)
- ✅ Session yönetimi (JWT strategy)

### 3. Route Protection
- ✅ Protected route middleware
- ✅ Session kontrolü (useSession hook)
- ✅ Admin layout protection
- ✅ Auth layout protection

### 4. Admin Dashboard
- ✅ Admin dashboard UI (mock data ile)
- ✅ İstatistik kartları
- ✅ Kullanıcı tablosu
- ✅ Hızlı erişim menüleri

---

## ❌ Eksik API Endpoints

### Authentication & Users (7 endpoints)
```
GET    /api/auth/me                    - Mevcut kullanıcı bilgisi
PUT    /api/auth/password              - Şifre değiştir
GET    /api/users                      - Tüm kullanıcılar (Admin)
GET    /api/users/:id                  - Kullanıcı detayı (Admin)
PUT    /api/users/:id                  - Kullanıcı güncelle (Admin)
DELETE /api/users/:id                  - Kullanıcı sil (Admin)
PUT    /api/users/:id/role             - Rol değiştir (Admin)
```

### Characters (7 endpoints)
```
GET    /api/characters                 - Kullanıcının karakterleri
POST   /api/characters                 - Yeni karakter oluştur
GET    /api/characters/:id             - Karakter detayı
PUT    /api/characters/:id             - Karakter güncelle
DELETE /api/characters/:id             - Karakter sil
PUT    /api/characters/:id/levelup    - Seviye atla
PUT    /api/characters/:id/hp          - HP güncelle
```

### Inventory (5 endpoints)
```
GET    /api/characters/:id/inventory  - Envanter listesi
POST   /api/characters/:id/inventory  - Item ekle
PUT    /api/characters/:charId/inventory/:itemId  - Item güncelle
DELETE /api/characters/:charId/inventory/:itemId  - Item sil
PUT    /api/characters/:charId/inventory/:itemId/equip  - Kuşan/Çıkar
```

### Campaigns (10 endpoints)
```
GET    /api/campaigns                  - Kullanıcının kampanyaları
POST   /api/campaigns                  - Yeni kampanya
GET    /api/campaigns/:id              - Kampanya detayı
PUT    /api/campaigns/:id              - Kampanya güncelle
DELETE /api/campaigns/:id              - Kampanya sil
POST   /api/campaigns/:id/start        - Kampanyayı başlat
POST   /api/campaigns/:id/join        - Kampanyaya katıl
POST   /api/campaigns/:id/leave       - Ayrıl
GET    /api/campaigns/join/:inviteCode - Davet ile katıl
POST   /api/campaigns/:id/invite      - Yeni davet kodu
```

### Game Sessions (7 endpoints) - ⚠️ KRİTİK
```
POST   /api/campaigns/:id/sessions    - Yeni session başlat
GET    /api/sessions/:id               - Session detayı
PUT    /api/sessions/:id               - Session güncelle
GET    /api/sessions/:id/state         - Oyun durumu (polling)
GET    /api/sessions/:id/messages      - Mesaj geçmişi
POST   /api/sessions/:id/messages      - Mesaj gönder
GET    /api/sessions/:id/updates       - Son güncellemeler (polling)
```

### AI Game Master (6 endpoints) - 🎯 AI ÖZELLİKLERİ
```
POST   /api/gm/narrate                 - Hikaye devam ettir
POST   /api/gm/npc-dialogue            - NPC konuşması
POST   /api/gm/generate-map            - Harita görseli oluştur (AI)
POST   /api/gm/generate-scenario       - AI senaryo oluştur
POST   /api/gm/combat-action           - Savaş aksiyonu yorumla
POST   /api/gm/describe-location       - Lokasyon betimle
```

### Dice System (5 endpoints)
```
POST   /api/dice/roll                  - Zar at
POST   /api/dice/roll-check            - Ability check at
POST   /api/dice/roll-attack           - Saldırı zarı
POST   /api/dice/roll-damage           - Hasar zarı
GET    /api/sessions/:id/dice-history  - Zar geçmişi
```

### Combat System (5 endpoints)
```
POST   /api/sessions/:id/combat/start  - Savaş başlat
GET    /api/combat/:id                 - Savaş durumu
POST   /api/combat/:id/action          - Aksiyon yap
POST   /api/combat/:id/next-turn       - Sonraki tur
POST   /api/combat/:id/end             - Savaş bitir
```

### Scenarios (7 endpoints)
```
GET    /api/scenarios                  - Tüm senaryolar
GET    /api/scenarios/official         - Resmi senaryolar
GET    /api/scenarios/mine             - Kullanıcının senaryoları
POST   /api/scenarios                  - Yeni senaryo
GET    /api/scenarios/:id              - Senaryo detayı
PUT    /api/scenarios/:id              - Senaryo güncelle
DELETE /api/scenarios/:id              - Senaryo sil
```

### Maps (3 endpoints)
```
GET    /api/sessions/:id/maps          - Session haritaları
POST   /api/sessions/:id/maps          - Harita ekle
DELETE /api/maps/:id                   - Harita sil
```

### NPCs (4 endpoints)
```
GET    /api/sessions/:id/npcs          - Session NPC'leri
POST   /api/sessions/:id/npcs          - NPC oluştur
PUT    /api/npcs/:id                   - NPC güncelle
DELETE /api/npcs/:id                   - NPC sil
```

### Admin (5 endpoints)
```
GET    /api/admin/stats                - Sistem istatistikleri
GET    /api/admin/users                - Kullanıcı listesi
GET    /api/admin/campaigns             - Tüm kampanyalar
GET    /api/admin/scenarios             - Tüm senaryolar
PUT    /api/admin/scenarios/:id/official - Resmi yap/kaldır
```

---

## 📦 Eksik Kütüphaneler ve Yardımcı Modüller

### AI Entegrasyon Kütüphaneleri (3 modül)
```
lib/ai/
├── openrouter.ts      - OpenRouter API client
├── prompts.ts         - AI prompt şablonları
└── context.ts         - Context yönetim sistemi
```

**Açıklama:**
- `openrouter.ts`: OpenRouter API ile iletişim için HTTP client
- `prompts.ts`: GM rolü, NPC diyalogları, senaryo oluşturma için hazır prompt şablonları
- `context.ts`: Oyun durumu, mesaj geçmişi, NPC bilgileri gibi context'i yöneten sistem

### Yardımcı Kütüphaneler (3 modül)
```
lib/
├── dice/
│   └── roller.ts     - Zar atma mantığı (d4-d100, advantage/disadvantage)
├── combat/
│   └── manager.ts    - Savaş sistemi mantığı (initiative, turn order, damage)
└── validators/
    └── schemas.ts    - Zod validation şemaları
```

---

## 🎯 AI Özellikleri İçin Öncelik Sırası

### FAZ 1: Temel AI Altyapısı (En Yüksek Öncelik)
Bu faz, AI Game Master'ın çalışması için kritik altyapıyı sağlar.

1. **AI Entegrasyon Kütüphaneleri**
   - `lib/ai/openrouter.ts` - OpenRouter API client
   - `lib/ai/prompts.ts` - System prompt, context prompt, task-specific prompts
   - `lib/ai/context.ts` - Context builder, history management

2. **Temel AI Endpoints**
   - `POST /api/gm/narrate` - Hikaye anlatımı (en kritik)
   - `POST /api/gm/npc-dialogue` - NPC diyalog sistemi

### FAZ 2: Oyun Oturumu ve Mesaj Sistemi
AI'nın oyuncularla iletişim kurması için gerekli sistem.

1. **Session Management**
   - `POST /api/campaigns/:id/sessions` - Session oluşturma
   - `GET /api/sessions/:id/state` - Oyun durumu
   - `PUT /api/sessions/:id` - Session güncelleme

2. **Message System**
   - `POST /api/sessions/:id/messages` - Mesaj gönderme
   - `GET /api/sessions/:id/messages` - Mesaj geçmişi
   - `GET /api/sessions/:id/updates` - Polling güncellemeleri

### FAZ 3: Destekleyici Sistemler
AI'nın karakterler, kampanyalar ve senaryolarla çalışması için gerekli.

1. **Character Management APIs** (7 endpoints)
2. **Campaign Management APIs** (10 endpoints)
3. **Scenario Management APIs** (7 endpoints)
4. **Dice Rolling APIs** (5 endpoints)
5. **Combat System APIs** (5 endpoints)

### FAZ 4: Gelişmiş AI Özellikleri
Temel sistem çalıştıktan sonra eklenecek özellikler.

1. **AI Scenario Generation**
   - `POST /api/gm/generate-scenario` - AI ile senaryo oluşturma

2. **AI Map Generation**
   - `POST /api/gm/generate-map` - AI ile harita görseli oluşturma

3. **Combat AI**
   - `POST /api/gm/combat-action` - Savaş aksiyonlarını AI ile yorumlama

4. **Location Description**
   - `POST /api/gm/describe-location` - Lokasyon betimleme

---

## 📈 İlerleme Durumu

| Kategori | Toplam | Tamamlanan | Tamamlanma Oranı |
|----------|--------|------------|------------------|
| API Endpoints | 65+ | 3 | ~5% |
| AI Endpoints | 6 | 0 | 0% |
| AI Libraries | 3 | 0 | 0% |
| Utility Libraries | 3 | 0 | 0% |
| Database Schema | 1 | 1 | 100% |
| Authentication | 1 | 1 | 100% |
| **TOPLAM** | **79+** | **8** | **~10%** |

---

## 🔧 Teknik Gereksinimler

### OpenRouter API Entegrasyonu

**Gerekli Environment Variables:**
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3-sonnet  # veya başka bir model
```

**OpenRouter API Client Temel Yapısı:**
```typescript
// lib/ai/openrouter.ts
export async function callOpenRouter(prompt: string, context: GameContext) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildContextPrompt(context) + prompt }
      ],
    }),
  });
  return response.json();
}
```

### Prompt Şablonları

**System Prompt (GM Rolü):**
```
You are an expert Dungeon Master for D&D 5e. Your role is to:
1. Tell engaging stories with vivid descriptions
2. Role-play NPCs with distinct personalities
3. Adjudicate rules fairly
4. Request dice rolls when needed
5. Adapt the story based on player choices

Always respond in Turkish unless otherwise specified.
```

**Context Prompt Yapısı:**
```typescript
interface GameContext {
  scenario: string;
  location: string;
  activeNPCs: NPC[];
  playerCharacters: Character[];
  recentMessages: Message[];
  gameState: GameState;
}
```

### Context Management

**Context Builder:**
```typescript
// lib/ai/context.ts
export function buildContextPrompt(context: GameContext): string {
  return `
Current Scenario: ${context.scenario}
Location: ${context.location}
Active NPCs: ${context.activeNPCs.map(npc => npc.name).join(', ')}

Party Members:
${context.playerCharacters.map(char => `- ${char.name} (Level ${char.level} ${char.class})`).join('\n')}

Recent Events:
${context.recentMessages.slice(-10).map(msg => `[${msg.senderType}]: ${msg.content}`).join('\n')}
  `.trim();
}
```

---

## 💡 Öneriler

### 1. Minimum Viable Product (MVP) İçin Gerekli API'ler
AI özelliklerini test etmek için en az şunlar gerekli:
- ✅ Authentication (tamamlandı)
- ❌ Character CRUD (7 endpoints)
- ❌ Campaign CRUD (10 endpoints)
- ❌ Session Management (7 endpoints)
- ❌ Message System (3 endpoints)
- ❌ AI Narration (1 endpoint)
- ❌ AI NPC Dialogue (1 endpoint)

**Toplam: 29 endpoints (MVP için)**

### 2. Test Stratejisi
1. Önce karakter ve kampanya oluşturma sistemini test et
2. Session oluşturma ve mesaj göndermeyi test et
3. AI entegrasyonunu mock data ile test et
4. Gerçek OpenRouter API'ye geçiş yap

### 3. Geliştirme Sırası Önerisi
1. **Character APIs** → Karakter oluşturabilmek için
2. **Campaign APIs** → Kampanya oluşturabilmek için
3. **Session APIs** → Oyun başlatabilmek için
4. **Message APIs** → İletişim kurabilmek için
5. **AI Libraries** → AI entegrasyonu için
6. **AI GM Endpoints** → AI Game Master için

---

## 🚀 Sonraki Adımlar

Bu analize göre, AI özelliklerini uygulamak için öncelikle şunları yapmalısınız:

1. **AI Entegrasyon Kütüphanelerini Oluşturun**
   - OpenRouter client
   - Prompt templates
   - Context manager

2. **Temel API Endpoints'leri Oluşturun**
   - Character management
   - Campaign management
   - Session management
   - Message system

3. **AI GM Endpoints'leri Oluşturun**
   - Story narration
   - NPC dialogue

4. **Test Edin**
   - Her endpoint'i ayrı ayrı test edin
   - AI entegrasyonunu test edin
   - End-to-end oyun akışını test edin

---

*Son Güncelleme: 3 Ocak 2025*
