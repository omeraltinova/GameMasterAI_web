# Phase Backlog (Eksik Ozellikler)

Bu dosya, planlanan ama henuz tamamlanmamis isleri takip eder.
Isaretleri tamamladikca guncelle. Yeni talepleri en alttaki "Yeni Isler" bolumune ekle.

Last update: 2026-01-25

## Faz 1 - Temel Altyapi (eksik olanlar)
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [x] | Auth middleware (server-side route protection) | Protected route'lari server tarafinda engellemek | Client layout guard tek basina yeterince guvenli degil, flash of protected content riski var | Client-side guard var: `app/(protected)/layout.tsx`, `app/(admin)/layout.tsx`; `middleware.ts` eklendi |
| [x] | Zod ile API schema validation (lib/validators + kullanimi) | Request/response dogrulamasini standartlastirmak | Manuel validation tutarsiz ve hataya acik | `lib/validators` eklendi; `/api/register` ve `/api/characters` POST zod kullaniyor |
| [x] | Zustand store (store/gameStore.ts) | Oyun state'ini global ve tutarli yonetmek | Birden fazla component/hook arasi senkron zor | `store/gameStore.ts` eklendi; `hooks/useGame.ts` store kullanacak sekilde guncellendi |

## Faz 2 - Kullanici & Karakter
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | Karakter olusturma wizard'ina gorsel/avatar secimi veya upload | Karaktere gorsel baglamak | Kartlar ve oyun arayuzu daha okunakli olur | `Character.imageUrl` var; wizard'da gorsel secimi yok |
| [ ] | Karakter level-up endpoint + UI akisi | Level-up kurallarini tek yerden uygulamak | XP kontrolu ve HP artisi manuel olmamali | `PUT /api/characters/:id` level/experience aliyor; ozel level-up endpoint ve UI yok |
| [ ] | Karakter HP hizli guncelleme endpoint + UI akisi | HP degisimi icin hizli akis | Combat/iyilesme akislari pratiklesir | `PUT /api/characters/:id` hp/maxHp kabul ediyor; hizli UI kontrolu yok |
| [ ] | Sifre degistirme UI + API | Kullanici sifresini guvenle degistirebilsin | Hesap guvenligi | Profilde "Degistir" butonu disabled; sifre degistirme endpoint'i yok |

## Faz 3 - Kampanya Sistemi (plan-paritesi)
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | /api/campaigns/:id/start endpointi | Kampanyayi baslatma icin tek endpoint | Planla uyum ve okunabilirlik | Baslatma `POST /api/campaigns/:id/sessions` ile |
| [ ] | /api/campaigns/:id/leave endpointi | Kampanyadan ayrilma akisinin standardi | Planla uyum | Ayrilma `DELETE /api/campaigns/:id/join` ile |
| [ ] | /api/campaigns/join/:inviteCode GET endpointi | Davet koduyla kampanya bilgisi getirmek | Planla uyum ve paylasim kolayligi | `POST /api/campaigns/join` (body: inviteCode) var; GET yok |

## Faz 4 - Oyun Mekanikleri
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | Combat sistemi (initiative, turn order, action/hasar hesaplama, combat log) | Savas akisini kurallara uygun yonetmek | Oynanis derinligi ve tek/coop deneyim | `app/api/gm/combat-action` var; combat state/CRUD endpointleri ve UI yok |
| [ ] | Map sistemi (session map CRUD, viewer/gallery, AI map generator UI) | Lokasyonlari gorsel takip etmek | Oyun takibi ve immersion | `app/api/gm/generate-map` + `LocationImage` var; session map CRUD ve harita galerisi yok |
| [ ] | Equipment slots UI + equip logic (head/neck/body vb.) | Ekipman slotlariyla net loadout | Item yonetimi sade ve kurallara uygun | Envanter listesi var (`components/character/InventoryGrid.tsx`); slot UI yok |

## Faz 5 - AI Entegrasyonu (eksik arayuzler)
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | AI senaryo olusturma arayuzu (/api/gm/generate-scenario) | Tek tikla senaryo uretmek | Kullanici hizli baslangic yapsin | Endpoint var, UI yok (senaryo formu manuel) |
| [ ] | AI harita olusturma arayuzu (/api/gm/generate-map) | Lokasyon haritasini AI ile uretmek | Gorsel destekle immersion artar | Endpoint var, UI yok |
| [ ] | NPC personality/attitude ayarlari UI (opsiyonel) | NPC davranisini ayarlamak | Tutarlilik ve hikaye kontrolu | NPC modelinde `personality` var; sadece goruntuleniyor (NPCModal) |

## Faz 6 - Polish & Test
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | Multiplayer polling dongusu (fetchUpdates interval + since) | Cok oyunculu real-time yakini guncelleme | Mesaj ve state senkronu | `useGame.fetchUpdates` var; interval/loop kullanilmiyor |
| [ ] | Global error boundary (app/error.tsx) | Uygulama genel hata yakalama | Uretimde stabil UX | `app/error.tsx` yok |
| [ ] | Seed data (prisma/seed.ts + script) | Demo/gelistirme baslangic verisi | Test ve onboarding kolayligi | `prisma/seed.ts` yok, `package.json`'da seed script yok |
| [ ] | Proje dokumantasyonu (README/usage) | Kurulum/akis dokumani | Yeni gelistirici onboarding | README Next.js default |

## Eksik Sayfalar
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | /characters/[id]/inventory sayfasi | Envanteri ayri sayfada yonetmek | Character sheet daha sade olur | Envanter karakter detay sayfasinda |
| [ ] | /admin/stats sayfasi | Admin istatistiklerini ayri sayfada toplamak | Dashboard sade kalir | Analytics admin dashboard icinde (`/admin`) |

## Eksik API Endpointleri (plan listesine gore)
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | /api/auth/register | Auth endpointlerini tek prefix altinda toplamak | Planla uyum | `POST /api/register` var |
| [ ] | /api/auth/login | Login endpointini planla uyumlu yapmak | Tek tip auth URL | `POST /api/login` var; NextAuth login de kullaniliyor |
| [ ] | /api/auth/logout | Cikis icin planli endpoint | Standart auth akisi | NextAuth `signOut` `/api/auth/signout` kullanir; custom route yok |
| [ ] | /api/auth/me | Aktif kullanici bilgisi almak | Istemci tarafinda session sync | NextAuth `GET /api/auth/session` var; custom `/auth/me` yok |
| [ ] | /api/auth/password | Sifre degistirme | Guvenlik | Yok |
| [ ] | /api/users/* | Kullanici yonetimi icin public API alan | Planla uyum | Admin endpointleri `app/api/admin/users` |
| [ ] | /api/characters/:id/levelup | Level-up icin kuralli islem | Tek noktada is kurallari | `PUT /api/characters/:id` ile level guncellenebiliyor |
| [ ] | /api/characters/:id/hp | HP update icin tek islem | Combat akisi | `PUT /api/characters/:id` hp/maxHp kabul ediyor |
| [ ] | /api/dice/roll-check | Ability check icin standart endpoint | Log/format birligi | Sadece `POST /api/dice/roll` var (purpose ile) |
| [ ] | /api/dice/roll-attack | Attack roll icin standart endpoint | Log/format birligi | Sadece `POST /api/dice/roll` var (purpose ile) |
| [ ] | /api/dice/roll-damage | Hasar roll icin standart endpoint | Log/format birligi | Sadece `POST /api/dice/roll` var (purpose ile) |
| [ ] | /api/sessions/:id/combat/start | Combat oturumu baslatmak | Combat state yonetimi | Yok; sadece GM combat-action endpointi var |
| [ ] | /api/combat/:id | Combat state okumak | UI guncelleme | Yok |
| [ ] | /api/combat/:id/action | Combat aksiyon islemi | Kurallari server tarafinda uygulamak | Yok |
| [ ] | /api/combat/:id/next-turn | Tur degisimi | Turn order tutarliligi | Yok |
| [ ] | /api/combat/:id/end | Combat bitirmek | State reset ve log | Yok |
| [ ] | /api/sessions/:id/maps | Session map CRUD | Harita galeri/guncelleme | Yok |
| [ ] | /api/maps/:id | Map silme/guncelleme | Map yonetimi | Yok |

## Yeni Isler
| Durum | Is | Amac | Neden | Mevcut |
| --- | --- | --- | --- | --- |
| [ ] | (ekle) |  |  |  |
