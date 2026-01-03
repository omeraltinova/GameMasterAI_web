# AI Entegrasyon Test Rehberi (Güncellenmiş)

Bu rehber, GameMaster AI projesinin AI entegrasyonunu test etmek için adım adım talimatlar içerir.

## 📋 Ön Hazırlık

### 1. Gerekli Paketleri Yükle

```bash
npm install tsx bcryptjs @types/bcryptjs
```

### 2. Environment Değişkenlerini Ayarla

`.env.local` dosyasını oluştur:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OpenRouter API (AI için)
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=anthropic/claude-3-sonnet

# App URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Not:** OpenRouter API key almak için: https://openrouter.ai/keys

### 3. Database Migrations'ı Çalıştır

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 🌱 Test Verisi Oluşturma

### Seed Script'i Çalıştır

```bash
npx tsx scripts/seed-test-data.ts
```

Bu script şunları oluşturur:
- ✅ Test kullanıcı: `test@example.com` / `password123`
- ✅ Test senaryo: "Kayıp Tapınak"
- ✅ Test karakter: "Thorin Kalkan" (Dwarf Fighter, Level 3)
- ✅ Test kampanya: "Thorin'in Macerası"
- ✅ Test envanter: Battleaxe, Chain Mail, Healing Potion, Shield
- ✅ Test oyun oturumu: Başlangıç state'i ile
- ✅ Hoş geldin mesajı
- ✅ Test NPC: "Yaşlı Muhafız"

## 🚀 Uygulamayı Başlatma

### Development Server

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## 🎮 Test Akışı

### 1. Giriş Yap

1. http://localhost:3000/login adresine git
2. Email: `test@example.com`
3. Password: `password123`
4. Giriş yap butonuna tıkla

**Beklenen Sonuç:**
- ✅ Başarılı giriş
- ✅ Session cookie oluşturuldu
- ✅ Dashboard'a yönlendirildi

### 2. Kampanyaya Git

1. Dashboard'da "Thorin'in Macerası" kampanyasını bul
2. Kampanya kartına tıkla
3. Kampanya detay sayfasına git

**Beklenen Sonuç:**
- ✅ Kampanya detayları görüntüleniyor
- ✅ Oyna butonu görünüyüyor

### 3. Oyunu Başlat

1. Kampanya detay sayfasında "Oyna" butonuna tıkla
2. Otomatik olarak oyun sayfasına yönlendirileceksin: `/campaigns/campaign_test_1/play`

**Beklenen Sonuç:**
- ✅ Oyun sayfası açılıyor
- ✅ Session detayları yükleniyor
- ✅ Mesajlar yükleniyor

### 4. AI Game Master ile Etkileşim

#### Mesaj Gönderme

1. "Aksiyonunu yaz..." alanına bir aksiyon yaz:
   ```
   Kapıyı açmaya çalışıyorum
   ```
2. "Gönder" butonuna tıkla
3. AI GM cevap verene kadar bekle (typing indicator görülecek)

**Beklenen Sonuç:**
- ✅ Player mesajı chat ekranında görünüyor
- ✅ "Game Master yazıyor..." indicator'ı görünüyor
- ✅ AI GM'den yanıt geliyor (2-3 saniye içinde)
- ✅ GM mesajı chat ekranında görünüyor
- ✅ Yanıt detaylı ve atmosferik olmalı

#### Zar Atma

1. "Zar At" butonuna tıkla
2. Side panel açılacak
3. Zar tipini seç (d4, d6, d8, d10, d12, d20, d100)
4. Zar sayısını ve modifier'ı ayarla
5. "At" butonuna tıkla
6. Sonuç chat ekranında görünecek

**Beklenen Sonuç:**
- ✅ Zar sonucu doğru hesaplanmalı
- ✅ Zar mesajı chat ekranında görünüyor
- ✅ Format: `🎲 1d20+3 = [15] + 3 = **18**`

#### Karakter Bilgilerini Görüntüleme

1. "Karakter" butonuna tıkla
2. Side panel açılacak
3. Karakter bilgileri (HP, Stats, Level, XP) görülecek

**Beklenen Sonuç:**
- ✅ Karakter bilgileri doğru görüntülenmeli
- ✅ HP bar, stats, level, XP gösterilmeli

#### Envanteri Görüntüleme

1. "Envanter" butonuna tıkla
2. Side panel açılacak
3. Envanter öğeleri listelenecek

**Beklenen Sonuç:**
- ✅ Envanter öğeleri doğru görüntülenmeli
- ✅ Kuşanılmış öğeler işaretli olmalı
- ✅ Miktar gösterilmeli

## 🧪 Test Senaryoları

### Senaryo 1: Basit Hikaye Anlatımı

**Amaç:** AI GM'in hikaye anlatımını test etmek

1. Mesaj gönder: "Etrafı dikkatlice inceliyorum"
2. AI GM'in yanıtını kontrol et
3. Mesaj gönder: "Yaşlı muhafızı görüyorum, ona yaklaşacağım"
4. AI GM'in NPC diyalogunu kontrol et
5. Mesaj gönder: "Sonuç [sonuç] geldi, ne buldum?"
6. AI GM'in zar sonucuna göre yanıt vermesini kontrol et

**Beklenen Sonuç:**
- ✅ AI GM detaylı ve atmosferik yanıt vermeli
- ✅ NPC diyalogları kişiliğe uygun olmalı
- ✅ Hikaye akışı mantıklı olmalı
- ✅ Zar sonuçlarına göre hikaye yönlendirmeli

### Senaryo 2: Zar Sistemi

**Amaç:** Zar atma ve AI GM'in zar sonuçlarını yorumlamasını test etmek

1. Zar at: d20 (Perception check)
2. Sonucu kontrol et
3. Mesaj gönder: "Sonuç [sonuç] geldi, ne buldum?"
4. AI GM'in zar sonucuna göre yanıt vermesini kontrol et

**Beklenen Sonuç:**
- ✅ Zar sonucu doğru hesaplanmalı (d20 + modifier)
- ✅ AI GM zar sonucuna göre hikayeyi yönlendirmeli
- ✅ Kritik başarı/başarısızlık durumunda özel yanıt vermeli

### Senaryo 3: NPC Etkileşimi

**Amaç:** NPC diyalog sistemini test etmek

1. Mesaj gönder: "Yaşlı muhafıza selam veriyorum"
2. AI GM'in NPC yanıtını kontrol et
3. Mesaj gönder: "Tapınak hakkında bilgi almak istiyorum"
4. AI GM'in NPC bilgisini aktarmasını kontrol et

**Beklenen Sonuç:**
- ✅ NPC diyalogları kişiliğe uygun olmalı
- ✅ NPC bilgileri tutarlı olmalı
- ✅ Hikaye NPC ile etkileşim sonrası devam etmeli

### Senaryo 4: Envanter ve Ekipman

**Amaç:** Envanter sistemini test etmek

1. "Envanter" butonuna tıkla
2. Envanter öğelerini kontrol et
3. Mesaj gönder: "Battleaxe'imi kuşanıyorum"
4. AI GM'in ekipman değişikliğini fark etmesini kontrol et

**Beklenen Sonuç:**
- ✅ Envanter doğru görüntülenmeli
- ✅ Ekipman kuşanma/çıkarma çalışmalı
- ✅ AI GM ekipman değişikliklerini hikayeye yansıtmalı

## 🐛 Hata Ayıklama

### Yaygın Sorunlar

#### 1. "Session bulunamadı" Hatası

**Neden:** Session ID yanlış veya veritabanında yok

**Çözüm:**
```bash
npx tsx scripts/seed-test-data.ts
```

#### 2. "AI GM cevap vermiyor" Hatası

**Neden:** OpenRouter API key eksik veya yanlış

**Çözüm:**
1. `.env.local` dosyasını kontrol et
2. `OPENROUTER_API_KEY` doğru ayarlanmış mı?
3. OpenRouter hesabında kredi var mı?

#### 3. "Zar atılamadı" Hatası

**Neden:** API endpoint çalışmıyor veya veritabanı bağlantısı yok

**Çözüm:**
1. Development server'ı yeniden başlat
2. Database migration'ı kontrol et
3. Browser console'da hata mesajlarını kontrol et

#### 4. "401 Unauthorized" Hatası

**Neden:** NextAuth session cookie eksik veya yanlış

**Çözüm:**
1. Giriş yapmış mısın? (http://localhost:3000/login)
2. Browser'da session cookie var mı? (F12 → Application → Cookies)
3. Cookie sil ve tekrar giriş yap

#### 5. TypeScript Hataları

**Neden:** Type tanımları eksik veya yanlış

**Çözüm:**
```bash
npm run build
```

Build hatalarını kontrol et ve düzelt.

## 📊 API Endpoint Testleri

### Manuel API Testi

Her endpoint'i manuel olarak test etmek için:

```bash
# Session detayı
curl http://localhost:3000/api/sessions/session_test_1

# Oyun durumu
curl http://localhost:3000/api/sessions/session_test_1/state

# Mesaj geçmişi
curl http://localhost:3000/api/sessions/session_test_1/messages

# Zar at
curl -X POST http://localhost:3000/api/dice/roll \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"session_test_1","diceType":"d20","count":1,"modifier":0}'

# AI narrate
curl -X POST http://localhost:3000/api/gm/narrate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"session_test_1","playerAction":"Kapıyı açmaya çalışıyorum"}'
```

## 🎯 Başarı Kriterleri

AI entegrasyonu başarılı kabul edilir için:

- ✅ Test kullanıcısı ile giriş yapılabilmeli
- ✅ Test kampanyası görüntülenebilmeli
- ✅ Oyun sayfası açılabilmeli
- ✅ AI GM mesajlara yanıt verebilmeli
- ✅ Zar sistemi çalışabilmeli
- ✅ Envanter görüntülenebilmeli
- ✅ NPC diyalogları çalışabilmeli
- ✅ Hikaye akışı mantıklı olmalı
- ✅ Hata handling düzgün çalışmalı

## 📝 Sonraki Adımlar

Test başarılı olduktan sonra:

1. **Frontend İyileştirmeleri:**
   - Toast notifications ekle
   - Loading states iyileştir
   - Error handling geliştir

2. **AI Özellikleri:**
   - NPC diyalog sistemi test et
   - Senaryo oluşturma test et
   - Harita oluşturma test et
   - Combat sistemi test et

3. **Polling Sistemi:**
   - Multiplayer için polling test et
   - Real-time güncellemeleri kontrol et

4. **Production Hazırlığı:**
   - Environment variables güvenli hale getir
   - Rate limiting ekle
   - Input validation iyileştir
   - Error monitoring ekle

## 📚 Ek Kaynaklar

- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## 💬 Destek

Sorun yaşarsan:
1. Browser console'da hata mesajlarını kontrol et
2. Terminal'de server loglarını kontrol et
3. API endpoint'lerini manuel olarak test et
4. Environment variables'ı kontrol et
5. NextAuth session cookie'yi kontrol et (F12 → Application → Cookies)

## 🔍 Debug İpuçları

### Browser Console'da Kontrol Et

1. F12 tuşuna basarak Developer Tools'u aç
2. Console sekmesine git
3. Hata mesajlarını kontrol et
4. Network sekmesinden API çağrılarını kontrol et

### Network Sekmesinden Kontrol Et

1. F12 → Network sekmesine git
2. API çağrılarını filtrele (fetch/xhr)
3. Request/Response detaylarını kontrol et
4. Status code'ları kontrol et (200, 401, 403, 404, 500)

### Terminal'de Kontrol Et

1. Terminal'de server loglarını kontrol et
2. Hata mesajlarını ara
3. Stack trace'leri incele

İyi testler! 🎲⚔️
