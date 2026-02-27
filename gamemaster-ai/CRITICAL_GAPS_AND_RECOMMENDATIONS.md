# GameMasterAI - Kritik Eksikler ve İyileştirme Raporu

Bu rapor, projenin mevcut durumu (Şubat 2026) üzerinden yapılan kapsamlı teknik inceleme sonucunda hazırlanmıştır. Projenin "üretim ortamına hazır" (production-ready) hale gelmesi için giderilmesi gereken temel eksikler aşağıda kategorize edilmiştir.

## 1. Test Kapsamı ve Kalite Güvencesi (Kritik)
**Mevcut Durum:** Projede otomatik test altyapısı bulunmamaktadır.
- **Eksik:** `Vitest` veya `Jest` (Unit/Integration) ve `Playwright` veya `Cypress` (E2E) kurulumları eksik.
- **Risk:** AI "tool-calling" mekanizması (karakter oluşturma, item verme vb.) çok karmaşık bir mantığa sahip. Yapılan küçük bir kod değişikliği tüm oyun akışını sessizce bozabilir.
- **Öneri:** Öncelikle `lib/ai/toolExecutor.ts` gibi kritik iş mantığı (business logic) içeren dosyalar için unit test yazılmalıdır.

## 2. Mimari ve Performans
### 2.1. Gerçek Zamanlı Güncelleme (Real-time)
**Mevcut Durum:** Çok oyunculu bir yapı olmasına rağmen "Polling" yöntemi kullanılmaktadır.
- **Eksik:** WebSocket (Socket.io) veya Server-Sent Events (SSE) entegrasyonu yok.
- **Risk:** Mesajların ve zar atışlarının anlık düşmemesi kullanıcı deneyimini bozar ve sunucuya gereksiz yük bindirir.
- **Öneri:** `Pusher` gibi bir servis veya doğrudan `Socket.io` entegrasyonu ile gerçek zamanlı veri akışı sağlanmalıdır.

## 3. Güvenlik ve Maliyet Kontrolü
### 3.1. AI Kullanım Limitleri (Quotas)
**Mevcut Durum:** Sadece temel IP bazlı rate limiting var.
- **Eksik:** Kullanıcı başına günlük token limiti veya AI kullanım maliyeti takibi.
- **Risk:** Bir kullanıcının (kötü niyetli veya yanlışlıkla) binlerce pahalı AI isteği atarak OpenRouter faturasını şişirmesi.
- **Öneri:** Kullanıcı tablosuna `ai_credits` veya `daily_limit` gibi alanlar eklenerek AI çağrıları sınırlandırılmalıdır.

### 3.2. RBAC (Rol Tabanlı Erişim Kontrolü)
**Mevcut Durum:** Admin ve Member rolleri var ancak yetkiler çok geniş.
- **Eksik:** "Game Master" ve "Player" rolleri arasında daha keskin ayrım (Örn: Oyuncu kendi karakteri dışındakileri görememeli).
- **Öneri:** Middleware seviyesinde daha detaylı yetki kontrolleri (Permission-based access control) uygulanmalıdır.

## 4. Kullanıcı Deneyimi ve Hata Yönetimi
**Mevcut Durum:** Global hata yakalama (Error Boundary) yapısı eksik.
- **Eksik:** `app/error.tsx`, `app/not-found.tsx` dosyaları ve standart API hata yanıtları.
- **Risk:** Bir API hatasında tüm sayfanın beyaz ekranda kalması veya kullanıcıya teknik hata mesajlarının (stack trace) sızması.
- **Öneri:** Next.js Error Boundary'leri kurulmalı ve tüm API'ler `{ success: boolean, error: string }` formatında standart yanıt dönmelidir.

## 5. Eksik Özellikler (UI/UX Gaps)
**Mevcut Durum:** Veritabanı tabloları hazır ancak arayüzler eksik.
- **Eksik:** 
    - **Combat Tracker:** Savaş sırasını takip eden UI.
    - **Map Gallery:** Haritaları listeleyen ve yöneten arayüz.
    - **Inventory Management UI:** Karakterlerin eşyalarını sürükle-bırak veya kolay yöntemle yönettiği panel.
- **Öneri:** `PHASE_BACKLOG.md` dosyasındaki önceliklere göre bu UI bileşenleri geliştirilmelidir.

## 6. Teknik Dokümantasyon
**Mevcut Durum:** `README.md` çok yüzeysel.
- **Eksik:** 
    - Kurulum rehberi (Setup Guide).
    - AI Prompt Logic (Sistemin GM gibi davranmasını sağlayan prompt'ların yapısı).
    - API Dokümantasyonu (Swagger/OpenAPI).
- **Öneri:** Geliştiricilerin projeye katkı sağlayabilmesi için `CONTRIBUTING.md` ve teknik detayları içeren bir `docs/` klasörü oluşturulmalıdır.

---
*Bu rapor otomatik olarak üretilmiştir ve projenin sağlıklı büyümesi için yol haritası niteliğindedir.*
