# AI Prompt Logic

Bu proje AI çağrılarını üç katmanda yönetir.

## 1. System Prompt Katmanı

Kaynak: `lib/ai/prompts.ts`

- GM davranış kuralları
- Dil, ton ve oyun mekanik sınırları
- Güvenlik/format beklentileri

## 2. Context Katmanı

Kaynak: `lib/ai/context.ts` ve route bazlı context üretimi

- Session state
- Son mesajlar
- Oyuncu/karakter bağlamı
- Senaryo/world bilgisi

## 3. User Prompt Katmanı

Kaynak: ilgili API route (`app/api/gm/*`)

- Kullanıcı aksiyonu
- Endpoint'e özel görev tanımı
- Beklenen çıktı formatı (çoğunlukla JSON)

## Tool Calling Akışı

Kaynak: `lib/ai/openrouter.ts`, `lib/ai/tools.ts`, `lib/ai/toolExecutor.ts`

1. Model tool çağrısı üretir.
2. Tool çağrıları backend'de execute edilir.
3. Gerekirse follow-up AI çağrısı ile anlatı metni alınır.

## Rate Limit ve Quota

Kaynak: `lib/security/aiRateLimit.ts`

- Dakikalık istek limiti
- Kullanıcı bazlı günlük token limiti
- OpenRouter `usage.total_tokens` ile gerçek tüketim yazımı

## Model Seçimi

Kaynak: `lib/ai/openrouter.ts`

Sıralama:

1. Admin panelinden system settings
2. Environment variable
3. Dahili default

Fallback model yalnızca primary model başarısız olduğunda devreye girer.
