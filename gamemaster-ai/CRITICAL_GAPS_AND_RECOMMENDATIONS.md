# GameMasterAI - Kritik Eksikler ve İyileştirme Raporu

Bu rapor, projenin mevcut durumu (Şubat 2026) üzerinden yapılan kapsamlı teknik inceleme sonucunda hazırlanmıştır. Projenin "üretim ortamına hazır" (production-ready) hale gelmesi için giderilmesi gereken temel eksikler aşağıda kategorize edilmiştir.

## 1. Test Kapsamı ve Kalite Güvencesi
**Mevcut Durum:** Test altyapısı (Vitest, React Testing Library, Playwright) projeye başarıyla kurulmuş olup temel konfigürasyonları yapılmıştır. Ancak testlerin yazımına henüz başlanmamıştır.

**Oluşturulan Kapsamlı Test Planı:**
Projeyi production ortamına hazırlamak için aşağıdaki sırayla testler yazılmalıdır:

### 1.1. Kritik İş Mantığı (Unit Tests) - Öncelikli
- **AI Tool Executor (`lib/ai/toolExecutor.ts`):** AI'dan gelen JSON yanıtlarının (karakter yaratma, hasar, eşya ekleme) doğru parse edilip Prisma'ya iletildiğini doğrulayan izole testler.
- **Zar Sistemi (`lib/dice` vb.):** Zar formatlarının (`2d6+3`) doğru hesaplandığı, kritik başarı (20) ve başarısızlık (1) durumlarının doğru işlendiği birim testler.
- **Karakter Sistemi:** Can (HP) hesaplama, stat/modifier dönüşümleri ve level up mekanizması.

### 1.2. Arayüz ve Bileşen (Component Tests)
- **Oyun İçi UI:** `DiceRoller` (zar etkileşimleri), `ChatWindow` (farklı mesaj tiplerinin render edilmesi), `CharacterCard` (HP bar ve stat gösterimi).
- Next.js Router ve `matchMedia` gibi bağımlılıklar `vitest.setup.ts` üzerinden mocklanmıştır.

### 1.3. API ve Entegrasyon (Integration Tests)
- **Prisma Mocking:** Veritabanı testleri için `__tests__/mocks/prisma.ts` oluşturulmuştur.
- API uç noktaları (`/api/auth`, `/api/campaigns`) için request/response doğrulamaları.
- RBAC (Role Based Access Control) kontrollerinin, oyuncuların admin API'sine erişimini engellediğinin testi.

### 1.4. Uçtan Uca (E2E Tests - Playwright)
- **Senaryo A:** Kayıt olma -> Karakter yaratma -> Karakteri kaydetme.
- **Senaryo B:** Kampanya koduyla odaya katılma -> Karakter seçme -> Lobiye girme.
- **Senaryo C:** Kampanya içinde mesaj atma -> Zar atma -> Sonuçları gerçek zamanlı (veya polling ile) görme.

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
