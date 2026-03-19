# Phase Backlog (Eksik Ozellikler)

Bu dosya, planlanan ama henuz tamamlanmamis isleri takip eder.
Isaretleri tamamladikca guncelle. Yeni talepleri en alttaki "Yeni Isler" bolumune ekle.

Last update: 2026-03-15

## Faz 1 - Temel Altyapi
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | Auth middleware (server-side route protection) | Protected route'lari server tarafinda engellemek | Client layout guard tek basina yeterince guvenli degil | `middleware.ts` aktif |
| [x] | Zod ile API schema validation (lib/validators + kullanimi) | Request/response dogrulamasini standartlastirmak | Manuel validation tutarsiz ve hataya acik | `lib/validators` aktif |
| [x] | Zustand store (store/gameStore.ts) | Oyun state'ini global ve tutarli yonetmek | Component/hook arasi senkron zor | `store/gameStore.ts` + `hooks/useGame.ts` |

## Faz 2 - Kullanici & Karakter
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | Karakter olusturma wizard'ina gorsel/avatar secimi veya upload | Karaktere gorsel baglamak | Kartlar ve oyun arayuzu daha okunakli olur | `app/(protected)/characters/new/page.tsx` |
| [x] | Karakter level-up endpoint + UI akisi | Level-up kurallarini tek yerden uygulamak | XP kontrolu ve HP artisi manuel olmamali | `PUT /api/characters/:id/levelup` + UI |
| [x] | Karakter HP hizli guncelleme endpoint + UI akisi | HP degisimi icin hizli akis | Combat/iyilesme akislari pratiklesir | `PUT /api/characters/:id/hp` + UI |
| [x] | Sifre degistirme UI + API | Kullanici sifresini guvenle degistirebilsin | Hesap guvenligi | `/api/auth/password` + profil formu |
| [x] | Karakter altin takibi (persist + UI) | Envanter ekonomisini gercek veriye baglamak | Placeholder yerine kalici ve guncellenebilir altin degeri | Character `gold` alani + inventory sayfasinda artir/azalt |

## Faz 3 - Oyun Mekanikleri
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | Combat sistemi (initiative, turn order, action/hasar, combat log) | Savas akisini yonetmek | Oynanis derinligi | `sessions/:id/combat/start` + `combat/:id/*` + play UI |
| [x] | Map sistemi (session map CRUD, viewer/gallery, AI map generator UI) | Lokasyonlari gorsel takip etmek | Oyun takibi ve immersion | `sessions/:id/maps`, `maps/:id`, `MapModal/MapGenerator` |
| [x] | Equipment slots UI + equip logic | Ekipman slotlariyla net loadout | Item yonetimi sade ve kurallara uygun | `EquipmentSlots` + equip endpointi |

## Faz 4 - AI Entegrasyonu
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | AI senaryo olusturma arayuzu (/api/gm/generate-scenario) | Tek tikla senaryo uretmek | Hizli baslangic | `ScenarioForm` icinde "AI ile Doldur" |
| [x] | AI harita olusturma arayuzu (/api/gm/generate-map) | Lokasyon haritasini AI ile uretmek | Gorsel destek | `MapModal` + `MapGenerator` |
| [x] | NPC personality/attitude ayarlari UI (opsiyonel) | NPC davranisini ayarlamak | Tutarlilik ve hikaye kontrolu | `NPCModal` icinde duzenleme formu + kaydet |

## Faz 5 - Polish & Test
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | Multiplayer polling dongusu (fetchUpdates interval + since) | Cok oyunculu real-time yakini guncelleme | Mesaj/state senkronu | SSE + polling fallback (5 sn) |
| [x] | Global error boundary (app/error.tsx) | Uygulama genel hata yakalama | Uretimde stabil UX | `app/error.tsx` var |
| [x] | Seed data (prisma/seed.ts + script) | Demo/gelistirme baslangic verisi | Test ve onboarding kolayligi | `prisma/seed.ts` + `npm run seed` |
| [x] | Proje dokumantasyonu (README/usage) | Kurulum/akis dokumani | Yeni gelistirici onboarding | README guncel |

## Eksik Sayfalar
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | /characters/[id]/inventory sayfasi | Envanteri ayri sayfada yonetmek | Character sheet sade kalsin | Sayfa mevcut |
| [x] | /admin/stats sayfasi | Admin istatistiklerini ayri sayfada toplamak | Dashboard sade kalir | Sayfa eklendi ve admin menusune baglandi |
| [x] | /scenarios/collections sayfasi | Senaryo koleksiyonlarini listelemek | Koleksiyonlar UI | Sayfa eklendi |
| [x] | /scenarios/collections/[id] sayfasi | Koleksiyon detaylarini gormek | Koleksiyon UI | Sayfa eklendi |
| [x] | /scenarios/collections API endpointleri | Koleksiyonlar icin API | User UI icin veri | GET /api/scenarios/collections ve /api/scenarios/collections/[id] |

## Eksik API Endpointleri (plan listesine gore)
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | /api/auth/register | Auth endpointlerini tek prefix altinda toplamak | Planla uyum | `POST /api/register` var |
| [ ] | /api/auth/login | Login endpointini planla uyumlu yapmak | Tek tip auth URL | `POST /api/login` var; NextAuth da kullaniliyor |
| [ ] | /api/auth/logout | Cikis icin planli endpoint | Standart auth akisi | NextAuth `signOut` kullaniliyor; custom route yok |
| [ ] | /api/auth/me | Aktif kullanici bilgisi endpointi | Session sync | NextAuth `GET /api/auth/session` var |
| [x] | /api/auth/password | Sifre degistirme | Guvenlik | Endpoint ve profil entegrasyonu var |
| [x] | /api/users/* | Kullanici liste/profile endpointleri | Planla uyum | `/api/users` ve `/api/users/:id` var |
| [x] | /api/characters/:id/levelup | Level-up icin kuralli islem | Tek noktada is kurallari | Var |
| [x] | /api/characters/:id/hp | HP update icin tek islem | Combat akisi | Var |
| [x] | /api/dice/roll-check | Ability check endpointi | Log/format birligi | Var |
| [x] | /api/dice/roll-attack | Attack roll endpointi | Log/format birligi | Var |
| [x] | /api/dice/roll-damage | Hasar roll endpointi | Log/format birligi | Var |
| [x] | /api/sessions/:id/combat/start | Combat oturumu baslatmak | Combat state yonetimi | Var |
| [x] | /api/combat/:id | Combat state okumak | UI guncelleme | Var |
| [x] | /api/combat/:id/action | Combat aksiyon islemi | Kurallari server tarafinda uygulamak | Var |
| [x] | /api/combat/:id/next-turn | Tur degisimi | Turn order tutarliligi | Var |
| [x] | /api/combat/:id/end | Combat bitirmek | State reset ve log | Var |
| [x] | /api/sessions/:id/maps | Session map CRUD | Harita galeri/guncelleme | Var |
| [x] | /api/maps/:id | Map silme/guncelleme | Map yonetimi | Var |

## Yeni Isler
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | Dokuman drift kontrolu (opsiyonel CI) | Route/OpenAPI/backlog uyumsuzlugunu erken yakalamak | Dokumanlar hizla eskiyor | Otomatik kontrol yok |
