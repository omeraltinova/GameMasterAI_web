# GameMaster AI

5e SRD tabanlı AI Game Master web uygulaması. Yapay zeka destekli anlatıcı ile solo veya grup halinde interaktif hikaye deneyimi sunar.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL 18 + Prisma ORM
- **Styling**: TailwindCSS 4 (Neon Arcane teması)
- **UI**: Radix UI + Framer Motion
- **Auth**: NextAuth.js
- **AI**: OpenRouter API
- **State**: Zustand + React Context

## Kurulum

### 1. Bağımlılıkları Kur

```bash
npm install
```

### 2. PostgreSQL Kurulumu

PostgreSQL kurulu ve çalışıyor olmalıdır.

**macOS (Homebrew):**
```bash
brew install postgresql@18
brew services start postgresql@18
createdb gamemaster
```

**Windows:**
1. [PostgreSQL](https://www.postgresql.org/download/windows/) indir ve kur
2. Cluster'ı initialize et (kurulum sırasında otomatik yapılır)
3. `gamemaster` veritabanını oluştur:
```bash
psql -U postgres -c "CREATE DATABASE gamemaster;"
```

**Not:** Development ortamında `pg_hba.conf` dosyasında localhost bağlantıları `trust` olarak ayarlanmıştır (şifresiz bağlantı). Bu sayede connection string'de şifre belirtmeye gerek yoktur.

### 3. Environment Variables

`.env.example` dosyasını `.env.local` olarak kopyalayın:

```bash
cp .env.example .env.local
```

Ayrıca Prisma'nın kullanması için `.env` dosyası da oluşturun (sadece `DATABASE_URL` yeterli):

```bash
cp .env.example .env
```

Gerekli değerleri doldurun (API key'ler, vs).

### 4. Veritabanı Migration

```bash
npx prisma migrate dev    # Migration'ları çalıştır + Prisma Client oluştur
npx prisma generate       # Prisma Client'ı yeniden oluştur (gerekirse)
```

### 5. Uygulamayı Başlat

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresinde açılır.

## Dokümantasyon

- Katkı rehberi: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Doküman indeksi: [`docs/README.md`](./docs/README.md)
- Kurulum detayı: [`docs/SETUP_GUIDE.md`](./docs/SETUP_GUIDE.md)
- Prompt mimarisi: [`docs/AI_PROMPT_LOGIC.md`](./docs/AI_PROMPT_LOGIC.md)
- API tanımı (OpenAPI): [`docs/OPENAPI.yaml`](./docs/OPENAPI.yaml)

## Komutlar

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm start            # Production server
npm run lint         # ESLint

npm test             # Unit testler (Vitest)
npm run test:ui      # Test UI
npm run test:coverage # Coverage raporu
npm run test:e2e     # E2E testler (Playwright)

npx prisma migrate dev    # Migration çalıştır
npx prisma generate       # Prisma Client oluştur
npx prisma studio         # Veritabanı GUI
```

## Veritabanı

### SQLite'dan PostgreSQL'e Geçiş

Proje başlangıçta SQLite kullanıyordu. PostgreSQL'e geçiş yapılmıştır:

- `prisma/schema.prisma` -> provider: `postgresql`
- Tüm migration'lar PostgreSQL uyumlu SQL ile yeniden oluşturuldu
- Mevcut veriler SQLite'dan PostgreSQL'e taşındı
- `prisma/dev.db` (SQLite dosyası) artık kullanılmıyor

### Development Bağlantısı

```
postgresql://postgres@localhost:5432/gamemaster?schema=public
```

localhost bağlantıları `trust` auth kullandığından şifre gerekmez.

---

## Production'a Çıkış Kontrol Listesi

Production ortamına deploy ederken aşağıdaki adımlar uygulanmalıdır:

### Veritabanı

- [ ] Production PostgreSQL sunucusu kur (AWS RDS, Supabase, Neon, vs.)
- [ ] Güçlü şifre ile PostgreSQL kullanıcısı oluştur
- [ ] SSL bağlantısını aktifleştir (`?sslmode=require` connection string'e ekle)
- [ ] `pg_hba.conf`'ta `trust` yerine `scram-sha-256` kullan
- [ ] Connection pooling ayarla (PgBouncer veya Prisma Accelerate)
- [ ] Otomatik backup planı oluştur
- [ ] `@prisma/client`'ı `devDependencies`'den `dependencies`'e taşı

### Güvenlik

- [ ] `NEXTAUTH_SECRET` için güçlü, rastgele bir key oluştur: `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL`'yi production domain'ine ayarla
- [ ] HTTPS zorunlu kıl
- [ ] Rate limiting ekle (API routes için)
- [ ] CORS ayarlarını kontrol et

### Environment Variables

- [ ] Tüm API key'lerin production key'leri ile değiştirildiğinden emin ol
- [ ] `NODE_ENV=production` ayarla
- [ ] `DATABASE_URL`'de SSL ve güçlü şifre kullan:
  ```
  postgresql://USER:GUCLU_SIFRE@HOST:5432/gamemaster?schema=public&sslmode=require
  ```

### Build & Deploy

- [ ] `npm run build` hatasız tamamlanmalı
- [ ] `npm run lint` hatasız geçmeli
- [ ] Testler geçmeli: `npm test`
- [ ] `npx prisma migrate deploy` ile production migration'larını çalıştır (dev değil!)
- [ ] Prisma Client'ın production'da generate edildiğinden emin ol

### Performans

- [x] Image optimization (Next.js Image component)
- [ ] Bundle size analizi
- [ ] Veritabanı index'lerini kontrol et
- [ ] CDN konfigürasyonu

---

## Proje Yapısı

```
app/
├── (public)/      # Landing, about, rules, demo (auth gerektirmez)
├── (auth)/        # Login, register
├── (protected)/   # Dashboard, characters, campaigns (member+)
└── (admin)/       # Admin paneli (admin only)

components/
├── ui/            # Button, Input, Card, Modal, vs.
├── layout/        # Header, Sidebar, Footer
├── auth/          # LoginForm, RegisterForm
├── character/     # CharacterCard
├── campaign/      # CampaignCard
└── game/          # ChatWindow, DiceRoller, MessageInput

prisma/
├── schema.prisma  # Veritabanı şeması
└── migrations/    # PostgreSQL migration dosyaları

types/
└── index.ts       # Tüm TypeScript tipleri
```
