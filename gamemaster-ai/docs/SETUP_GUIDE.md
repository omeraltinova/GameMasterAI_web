# Setup Guide

## Ön Koşullar

- Node.js 20+
- npm 10+
- PostgreSQL 15+

## 1. Bağımlılıklar

```bash
npm install
```

## 2. Environment

```bash
cp .env.example .env
cp .env.example .env.local
```

Minimum gerekli alanlar:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `OPENROUTER_API_KEY`

## 3. Veritabanı

```bash
npx prisma migrate dev
npx prisma generate
```

## 4. Çalıştırma

```bash
npm run dev
```

Uygulama: `http://localhost:3000`

## 5. Test

```bash
npm test
```

Opsiyonel:

```bash
npm run test:e2e
```

## 6. AI Quota Alanları

`User` modelinde günlük AI kullanımını takip eden alanlar bulunur:

- `aiDailyTokenLimit`
- `aiTokensUsedToday`
- `aiUsageResetAt`

Migration sonrası bu alanlar otomatik oluşur.
