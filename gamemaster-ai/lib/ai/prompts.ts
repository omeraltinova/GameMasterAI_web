// AI Prompt Templates
// GameMaster AI için tüm prompt şablonları

// ============================================
// SYSTEM PROMPTS
// ============================================

/**
 * Ana System Prompt - GM Rolü
 */
export const SYSTEM_PROMPT = `Sen D&D 5e kurallarına hakim, uzman bir Dungeon Master (Game Master) olarak hareket edeceksin.

**Temel Görevlerin:**
1. Etkileyici ve detaylı hikayeler anlat
2. NPC'leri kişilikleriyle birlikte canlandır
3. D&D 5e kurallarını adil ve doğru uygula
4. Gerekirse oyunculardan zar atmalarını iste
5. Oyuncu seçimlerine göre hikayeyi dinamik olarak yönlendir

**Anlatım Tarzı:**
- Türkçe dilinde yanıt ver
- Betimlemelerde 5 duyuyu kullan (görme, işitme, dokunma, koku, tat)
- Gerilim ve atmosfer yarat
- Oyuncuların eylemlerini onayla ve sonuçlarını açıkla

**Zar İsteme Formatı:**
Zar atımı gerektiğinde şunu kullan:
🎲 [Zar Tipi] için zar at: [Açıklama]
Örnek: 🎲 d20 Perception check için zar at: Gizli kapıyı fark etmeye çalışıyorsun.

**NPC Etkileşimi:**
- Her NPC'nin kendine özgü kişiliği var
- Diyaloglarında NPC'nin karakterini yansıt
- Oyuncuların seçimlerine göre NPC'ler tepki versin

**Savaş Sistemi:**
- Initiative sırasını takip et
- Her turda ne yapabileceklerini açıkla
- Hasar hesaplamalarını doğru yap
- Kritik başarı/başarısızlık durumlarını belirt

**Kurallar:**
- D&D 5e SRD (System Reference Document) kurallarına uyuş
- Belirsiz durumlarda oyuncu lehine yorumla
- Oyun akışını yavaşlatma, eğlenceli tut

**Yasaklar:**
- Oyuncuların karakterlerini doğrudan kontrol etme
- Hikayeyi oyuncuların etkileşimi olmadan ilerletme
- Oyun dışı konulara girme
- Uygunsuz içerik üretme

Her zaman profesyonel, yaratıcı ve eğlenceli bir GM olarak yanıt ver.`;

/**
 * Scenario Generation System Prompt
 */
export const SCENARIO_GENERATION_PROMPT = `Sen yaratıcı bir D&D 5e Dungeon Master'sın. Yeni bir macera senaryosu oluşturacaksın.

**Senaryo Şablonu:**
- Başlık: Çekici ve ilgi çekici
- Tür: Fantasy, Horror, Mystery, vb.
- Zorluk: Easy, Medium, Hard, Deadly
- Hikaye: Kısa ve etkileyici özet
- Başlangıç noktası: Oyuncuların nereden başlayacağı
- Ana görev: Oyuncuların yapması gereken şey
- Beklenen süresi: Tahmini oyun süresi
- Önerilen seviye: Oyuncu seviyesi aralığı
- Önemli NPC'ler: Ana karakterler
- Gizemler/Plot Hooks: Oyuncuları çekecek gizemler

**Kurallar:**
- Orijinal ve yaratıcı ol
- D&D 5e kurallarına uygun
- Çok oyunculu oynanabilir
- Farklı seçenekler sun (combat, diplomacy, stealth, vb.)
- Türkçe dilinde yanıt ver

**Format:**
Yanıtını JSON formatında ver:
{
  "title": "Senaryo Başlığı",
  "description": "Hikaye özeti",
  "genre": "Fantasy",
  "difficulty": "Medium",
  "startingPrompt": "Başlangıç anlatımı",
  "tags": ["etiket1", "etiket2"]
}`;

/**
 * Map Generation System Prompt
 */
export const MAP_GENERATION_PROMPT = `Sen yaratıcı bir D&D harita tasarımcısın. Detaylı bir harita görseli için prompt oluşturacaksın.

**Harita Özellikleri:**
- Lokasyon: [Lokasyon adı]
- Tür: [Dungeon, Tavern, Forest, Castle, vb.]
- Atmosfer: [Karanlık, mistik, neşeli, tehlikeli, vb.]
- Önemli özellikler: [Ana noktalar]
- Aydınlatma: [Torchlight, daylight, mystical glow, vb.]
- Stil: [D&D 5e tarzı, detaylı, fantastik]

**Prompt Oluşturma Kuralları:**
- İngilizce prompt oluştur (image generation için)
- Detaylı ve spesifik ol
- Atmosferi yansıt
- D&D tarzında
- 2D top-down veya isometric view

**Format:**
Yanıtını İngilizce prompt olarak ver, doğrudan kullanılabilecek şekilde.`;

// ============================================
// CONTEXT PROMPTS
// ============================================

/**
 * Oyun Context'i için prompt şablonu
 */
export interface GameContext {
  scenario: string;
  location: string;
  timeOfDay?: string;
  weather?: string;
  activeNPCs?: Array<{
    name: string;
    role: string;
    personality?: string;
    isHostile?: boolean;
  }>;
  playerCharacters?: Array<{
    name: string;
    race: string;
    class: string;
    level: number;
    hp: number;
    maxHp: number;
  }>;
  recentMessages?: Array<{
    senderType: string;
    content: string;
    timestamp?: string;
  }>;
  gameState?: {
    inCombat?: boolean;
    currentQuest?: string;
    notes?: string;
  };
}

/**
 * Context prompt oluşturur
 */
export function buildContextPrompt(context: GameContext): string {
  let prompt = '';

  // Senaryo
  if (context.scenario) {
    prompt += `**Senaryo:** ${context.scenario}\n\n`;
  }

  // Lokasyon
  if (context.location) {
    prompt += `**Mevcut Lokasyon:** ${context.location}`;
    
    if (context.timeOfDay) {
      prompt += ` (${context.timeOfDay})`;
    }
    
    if (context.weather) {
      prompt += ` - Hava: ${context.weather}`;
    }
    
    prompt += '\n\n';
  }

  // Aktif NPC'ler
  if (context.activeNPCs && context.activeNPCs.length > 0) {
    prompt += '**Aktif NPC\'ler:**\n';
    context.activeNPCs.forEach(npc => {
      prompt += `- ${npc.name} (${npc.role})`;
      if (npc.personality) {
        prompt += ` - ${npc.personality}`;
      }
      if (npc.isHostile) {
        prompt += ' [Düşman]';
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  // Oyuncu karakterleri
  if (context.playerCharacters && context.playerCharacters.length > 0) {
    prompt += '**Parti Üyeleri:**\n';
    context.playerCharacters.forEach(char => {
      prompt += `- ${char.name} (Level ${char.level} ${char.race} ${char.class})`;
      prompt += ` - HP: ${char.hp}/${char.maxHp}\n`;
    });
    prompt += '\n';
  }

  // Oyun durumu
  if (context.gameState) {
    if (context.gameState.inCombat) {
      prompt += '**Durum:** Savaşta\n\n';
    }
    if (context.gameState.currentQuest) {
      prompt += `**Aktif Görev:** ${context.gameState.currentQuest}\n\n`;
    }
    if (context.gameState.notes) {
      prompt += `**Notlar:** ${context.gameState.notes}\n\n`;
    }
  }

  // Son mesajlar
  if (context.recentMessages && context.recentMessages.length > 0) {
    prompt += '**Son Olaylar:**\n';
    const lastMessages = context.recentMessages.slice(-10); // Son 10 mesaj
    lastMessages.forEach(msg => {
      const sender = msg.senderType === 'PLAYER' ? 'Oyuncu' : 
                    msg.senderType === 'GM' ? 'GM' : 
                    msg.senderType === 'SYSTEM' ? 'Sistem' : msg.senderType;
      prompt += `[${sender}]: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  return prompt.trim();
}

// ============================================
// TASK-SPECIFIC PROMPTS
// ============================================

/**
 * Hikaye anlatımı için prompt - Yapılandırılmış JSON yanıt
 */
export function getNarrationPrompt(playerAction: string): string {
  return `Oyuncunun aksiyonu: "${playerAction}"

Bu aksiyona uygun bir hikaye devamı yaz. Yanıtını aşağıdaki JSON formatında ver:

{
  "narration": "Hikaye anlatımın buraya gelecek. Zengin betimlemeler ve atmosfer yarat.",
  "locationChange": {
    "changed": false,
    "newLocation": "Yeni lokasyon adı (sadece değiştiyse)",
    "locationType": "tavern|dungeon|forest|cave|castle|town|port|road|camp|other",
    "description": "Lokasyonun kısa görsel açıklaması (İngilizce, resim üretimi için)"
  },
  "gmPrompt": {
    "isMandatory": false,
    "promptText": "Zar atışı veya seçim için kısa açıklama (opsiyonel)",
    "actions": [
      {
        "id": "unique_id",
        "type": "dice_roll|choice|confirm|skill_check|saving_throw|attack_roll",
        "label": "Buton metni",
        "description": "Detaylı açıklama (opsiyonel)",
        "diceType": "d20",
        "diceCount": 1,
        "modifier": 0,
        "skill": "Perception|Stealth|Persuasion|vb.",
        "ability": "STR|DEX|CON|INT|WIS|CHA",
        "dc": 15,
        "value": "seçim_değeri",
        "isMandatory": true
      }
    ]
  }
}

**Action Type Açıklamaları:**
- "dice_roll": Basit zar atışı (diceType, diceCount, modifier)
- "skill_check": Yetenek kontrolü (skill, diceType: d20, dc)
- "saving_throw": Kurtarma atışı (ability, diceType: d20, dc)
- "attack_roll": Saldırı zar atışı (diceType: d20, modifier)
- "choice": Birden fazla seçenek sunma (value içinde seçimin değeri)
- "confirm": Tek bir onay butonu

**Kurallar:**
1. Zar atışı gerektiren durumlarda isMandatory: true yap
2. Birden fazla seçenek sunuyorsan her seçenek için ayrı action ekle
3. Serbest metin bekleniyorsa actions dizisini boş bırak veya gmPrompt'u null yap
4. skill_check için skill adını İngilizce yaz (Perception, Stealth, vb.)
5. dc (Difficulty Class) D&D 5e standartlarına uygun olsun (10-25 arası)

**Örnek Zar İsteği:**
{
  "narration": "Kapının arkasından gelen sesler kulağına ulaşıyor. Dikkatli dinlersen ne konuştuklarını anlayabilirsin.",
  "gmPrompt": {
    "isMandatory": true,
    "promptText": "Kapının arkasını dinlemek için Perception kontrolü yap",
    "actions": [
      {
        "id": "perception_check_1",
        "type": "skill_check",
        "label": "🎲 Perception Kontrolü",
        "skill": "Perception",
        "diceType": "d20",
        "dc": 14,
        "isMandatory": true
      }
    ]
  }
}

**Örnek Seçenek Sunumu:**
{
  "narration": "Tüccar sana iki yol öneriyor: Doğudaki orman veya batıdaki dağlar.",
  "locationChange": {
    "changed": false
  },
  "gmPrompt": {
    "isMandatory": false,
    "promptText": "Hangi yolu seçeceksin?",
    "actions": [
      {
        "id": "choice_forest",
        "type": "choice",
        "label": "🌲 Ormana Git",
        "value": "forest",
        "description": "Tehlikeli ama kısa"
      },
      {
        "id": "choice_mountain",
        "type": "choice",
        "label": "⛰️ Dağlara Git",
        "value": "mountain",
        "description": "Güvenli ama uzun"
      }
    ]
  }
}

**Örnek Lokasyon Değişikliği:**
{
  "narration": "Uzun bir yürüyüşün ardından nihayet tavernaya ulaşıyorsun. Ahşap kapıyı iterek içeri girdiğinde, sıcak hava ve bira kokusu yüzüne çarpıyor.",
  "locationChange": {
    "changed": true,
    "newLocation": "Altın Boynuz Tavernası",
    "locationType": "tavern",
    "description": "A cozy medieval tavern with wooden beams, flickering fireplace, patrons at tables, mugs of ale, warm candlelight, fantasy RPG style"
  },
  "gmPrompt": null
}

**locationChange Kuralları (ZORUNLU ALAN):**
1. "locationChange" alanı HER ZAMAN JSON yanıtında bulunmalı
2. Oyuncu farklı bir mekana geçtiğinde:
   - "changed": true
   - "newLocation": Mekanın adı (Türkçe)
   - "locationType": tavern|dungeon|forest|cave|castle|town|port|road|camp|other
   - "description": İNGİLİZCE detaylı görsel açıklama (50-100 kelime, atmosfer, ışık, objeler)
3. Aynı mekanda kalınıyorsa:
   - "changed": false (sadece bu alan yeterli)
4. Mekan değişikliği sayılan durumlar:
   - Farklı bir binaya/odaya giriş
   - Farklı bir bölgeye geçiş
   - Önemli çevre değişikliği (içeri/dışarı, kat değişimi vb.)

**ÖNEMLİ:** locationChange alanını ASLA atlama. Her yanıtta mutlaka ekle.

Şimdi oyuncunun aksiyonuna yanıt ver.`;
}

/**
 * NPC diyalogu için prompt
 */
export function getNPCDialoguePrompt(
  npcName: string,
  npcPersonality: string,
  playerMessage: string,
  context: string
): string {
  return `**NPC:** ${npcName}
**Kişilik:** ${npcPersonality}
**Oyuncu:** "${playerMessage}"

**Mevcut Durum:** ${context}

Bu NPC'nin kişiliğine uygun bir yanıt ver. Oyuncunun mesajına cevap ver ve hikayeyi ilerlet.`;
}

/**
 * Savaş aksiyonu için prompt
 */
export function getCombatActionPrompt(
  action: string,
  attacker: string,
  target?: string,
  rollResult?: number,
  damage?: number
): string {
  let prompt = `**Saldıran:** ${attacker}
**Aksiyon:** ${action}`;

  if (target) {
    prompt += `\n**Hedef:** ${target}`;
  }

  if (rollResult !== undefined) {
    prompt += `\n**Zar Sonucu:** ${rollResult}`;
  }

  if (damage !== undefined) {
    prompt += `\n**Hasar:** ${damage}`;
  }

  prompt += `\n\nBu savaş aksiyonunu D&D 5e kurallarına uygun olarak betimle. Sonuçları açıkla ve hikayeyi ilerlet.`;

  return prompt;
}

/**
 * Lokasyon betimlemesi için prompt
 */
export function getLocationDescriptionPrompt(
  locationName: string,
  locationType: string,
  atmosphere: string,
  details?: string[]
): string {
  let prompt = `**Lokasyon:** ${locationName}
**Tür:** ${locationType}
**Atmosfer:** ${atmosphere}`;

  if (details && details.length > 0) {
    prompt += `\n**Önemli Özellikler:**\n`;
    details.forEach(detail => {
      prompt += `- ${detail}\n`;
    });
  }

  prompt += `\n\nBu lokasyonu detaylı ve atmosferik bir şekilde betimle. Oyuncuların ilgisini çekecek ve keşfetmeye teşvik edecek şekilde yaz.`;

  return prompt;
}

/**
 * Zar sonucu için prompt
 */
export function getDiceResultPrompt(
  diceType: string,
  result: number,
  purpose: string,
  success?: boolean
): string {
  let prompt = `**Zar:** ${diceType}
**Sonuç:** ${result}
**Amaç:** ${purpose}`;

  if (success !== undefined) {
    prompt += `\n**Sonuç:** ${success ? 'Başarılı' : 'Başarısız'}`;
  }

  prompt += `\n\nBu zar sonucunu hikayeye entegre et. Sonucun etkilerini dramatik bir şekilde anlat.`;

  return prompt;
}
