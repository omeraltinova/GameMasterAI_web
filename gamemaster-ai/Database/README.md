# 🗄️ GameMaster AI - Veritabanı

Bu belge, projenin veritabanı yapılandırmasını ve kullanımını açıklar.

---

## 📦 Teknolojiler

| Paket | Versiyon | Açıklama |
|-------|----------|----------|
| `prisma` | 5.22.0 | ORM ve migration aracı |
| `@prisma/client` | 5.22.0 | Veritabanı client |
| `sqlite` | - | Hafif, dosya tabanlı veritabanı |

---

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Veritabanını oluştur
npx prisma migrate dev

# Client generate et
npx prisma generate
```

---

## 📁 Dosya Yapısı

```
gamemaster-ai/
├── prisma/
│   ├── schema.prisma    # Tablo tanımları (12 tablo)
│   ├── dev.db           # SQLite veritabanı
│   └── migrations/      # Migration dosyaları
│
├── lib/db/
│   └── prisma.ts        # Prisma client singleton
│
└── Database/
    ├── README.md        # Bu dosya
    ├── database-plan.md # Detaylı tablo planı
    └── test-db.ts       # Test script (Opsiyonel)
```

---

## 💻 Kullanım

### Import
```typescript
import { prisma } from "@/lib/db/prisma";
```

### Örnek Sorgular
```typescript
// Kullanıcı oluştur
const user = await prisma.user.create({
  data: {
    email: "test@mail.com",
    username: "testuser",
    password: "hashedpassword",
    role: "MEMBER",
  },
});

// Karakter getir (ilişkilerle)
const character = await prisma.character.findUnique({
  where: { id: "character_id" },
  include: { inventoryItems: true },
});

// Kampanyaları listele
const campaigns = await prisma.campaign.findMany({
  include: { creator: true, players: true },
});
```

---

## 📊 Tablolar

| Tablo | Açıklama |
|-------|----------|
| `User` | Kullanıcılar (role: VISITOR/MEMBER/ADMIN) |
| `Character` | D&D karakterleri |
| `Campaign` | Oyun kampanyaları |
| `GameSession` | Oyun oturumları |
| `Message` | Sohbet mesajları |
| `DiceRoll` | Zar atımları |
| `Scenario` | Oyun senaryoları |
| `NPC` | NPC'ler |
| `Combat` | Savaş durumları |
| `InventoryItem` | Envanter öğeleri |
| `Map` | Haritalar |
| `CampaignPlayer` | Kampanya-oyuncu ilişkisi |

---

## 🛠️ Faydalı Komutlar

```bash
# Veritabanını görsel olarak incele
npx prisma studio

# Yeni migration oluştur
npx prisma migrate dev --name migration_adi

# Veritabanını sıfırla
npx prisma migrate reset
```

---

## ⚠️ Notlar

- SQLite enum desteklemediği için `role`, `status`, `senderType` alanları **String** olarak tanımlandı
- Veritabanı dosyası: `prisma/dev.db`
- Production'da PostgreSQL'e geçiş planlanabilir
