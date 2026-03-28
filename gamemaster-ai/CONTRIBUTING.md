# Contributing

Bu doküman projeye katkı verirken takip edilmesi gereken teknik akışı özetler.

## 1. Geliştirme Ortamı

1. `npm install`
2. `.env.example` dosyasını `.env` ve `.env.local` olarak kopyala.
3. Veritabanı migration'larını çalıştır:
   - `npx prisma migrate dev`
   - `npx prisma generate`
4. Uygulamayı başlat: `npm run dev`

Detaylı adımlar için [`docs/SETUP_GUIDE.md`](./docs/SETUP_GUIDE.md) dosyasını kullan.

## 2. Branch ve Commit Standardı

- Kısa ömürlü branch kullan: `feature/*`, `fix/*`, `chore/*`.
- Küçük ve geri alınabilir commitler üret.
- Önerilen commit formatı:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `test: ...`
  - `docs: ...`

## 3. Kod Standardı

- TypeScript strict moda uyumlu yaz.
- API route'larda auth + RBAC kontrolünü ilk blokta yap.
- Shared iş kurallarını `lib/*` altında helper olarak çıkar.
- JSON alanları için parse işlemlerinde try/catch kullan.

## 4. Test Standardı

Bir değişiklikte aşağıdakileri hedefle:

1. İlgili unit test(ler)i ekle veya güncelle.
2. Var olan davranışı kırmadığını doğrula:
   - `npm test`
3. Büyük API değişikliğinde e2e doğrulaması yap:
   - `npm run test:e2e`

## 5. Güvenlik ve Operasyon

- Secrets dosyaya yazılmaz; yalnızca environment variable.
- AI endpoint'lerinde hem request-rate hem token-usage limitleri korunur.
- Session/campaign işlemlerinde GM vs Player ayrımı route seviyesinde korunur.

## 6. Dokümantasyon Güncelleme

Aşağıdaki dosyalar değişiklikle birlikte güncel tutulmalıdır:

- Kurulum veya config değiştiyse: `docs/SETUP_GUIDE.md`
- Prompt veya AI akışı değiştiyse: `docs/AI_PROMPT_LOGIC.md`
- API davranışı değiştiyse: `docs/OPENAPI.yaml`
