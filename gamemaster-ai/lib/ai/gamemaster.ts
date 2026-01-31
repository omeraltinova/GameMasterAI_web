/**
 * GameMaster AI Utilities
 * Oyun anlatısı ve GM fonksiyonları
 */

import { callOpenRouter } from './openrouter';

interface OpeningNarrationParams {
  scenarioTitle: string;
  scenarioDescription: string;
  gmInstructions: string;
  worldSettings?: {
    worldName?: string;
    worldType?: string;
    setting?: string;
    era?: string;
    tone?: string;
    startingLocation?: {
      name?: string;
      description?: string;
      atmosphere?: string;
    };
  } | null;
  characterName?: string;
  characterClass?: string;
  characterRace?: string;
}

/**
 * Senaryo bilgilerini kullanarak atmosferik bir açılış anlatısı üretir
 * GM talimatlarını oyuncuya göstermeden, onları kullanarak güzel bir hikaye başlangıcı oluşturur
 */
export async function generateOpeningNarration(params: OpeningNarrationParams): Promise<string> {
  const {
    scenarioTitle,
    scenarioDescription,
    gmInstructions,
    worldSettings,
    characterName,
    characterClass,
    characterRace,
  } = params;

  const systemPrompt = `Sen bir hikaye anlatıcısısın. Görevin, oyuncuya atmosferik ve sürükleyici bir açılış sahnesi yazmak.

KESİNLİKLE YAPMA:
- "GM Talimatları", "Sahne:", "DC", "check", "roll" gibi oyun mekaniği terimleri kullanma
- Başlık veya bölüm isimleri yazma
- Madde işaretleri veya listeler kullanma
- Oyun kuralları veya zorluk dereceleri (DC) belirtme
- "İpucu", "Öneri", "Talimat" gibi meta-bilgiler ekleme

SADECE ŞU FORMATTA YAZ:
Düz metin olarak, sanki bir roman açılışı gibi, atmosferik bir sahne betimlemesi yaz. Oyuncuyu hikayenin içine çek. 2. tekil şahıs kullan ("...sınız", "...sunuz"). 4-6 cümle yeterli. Duyusal detaylar ekle (görüntü, ses, koku, his). Sonunda oyuncuyu harekete geçirecek bir soru veya davet ile bitir.

Örnek format:
"Akşamın alacakaranlığında köyün dar sokaklarından geçerken, uzaktan yankılanan çan sesleri kulağınıza ulaşıyor. Eski taş evlerin arasından süzülen ışıklar, yolunuzu aydınlatıyor. Önünüzde yükselen kule, gizemli bir sessizlik içinde bekliyor. Ne yapacaksınız?"`;


  const userPrompt = `Senaryo: ${scenarioTitle}
Açıklama: ${scenarioDescription}
${worldSettings?.startingLocation ? `Mekan: ${worldSettings.startingLocation.name} - ${worldSettings.startingLocation.description || ''} (${worldSettings.startingLocation.atmosphere || ''})` : ''}
${worldSettings?.worldName ? `Dünya: ${worldSettings.worldName}` : ''}
${characterName ? `Karakter: ${characterName}${characterRace ? ` (${characterRace}` : ''}${characterClass ? ` ${characterClass})` : ')'}` : ''}

Arka plan bilgisi (bunu KULLAN ama AYNEN YAZMA, sadece sahneyi şekillendirmek için referans al):
${gmInstructions}

Şimdi yukarıdaki bilgileri kullanarak, sadece düz metin olarak atmosferik bir açılış yaz. Başlık, liste veya oyun mekaniği terimi KULLANMA:`;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.8,
      maxTokens: 10000,
    });

    const narration = response.choices[0]?.message?.content?.trim();
    
    if (!narration) {
      throw new Error('AI response empty');
    }

    // AI yanıtında hala GM talimatları varsa temizle
    const cleanedNarration = cleanGMInstructions(narration);
    
    // Eğer temizleme sonrası tamamen boş kaldıysa, orijinal narration'ı kullan
    if (!cleanedNarration || cleanedNarration.trim().length === 0) {
      console.log('[gamemaster] Cleaned narration empty, using original');
      return narration;
    }

    return cleanedNarration;
  } catch (error) {
    console.error('Opening narration generation error:', error);
    throw error;
  }
}

/**
 * Senaryo talimatlarının oyuncuya gösterilip gösterilmeyeceğini kontrol eder
 * GM talimatları belirli kalıplar içeriyorsa bunlar dahili kullanım içindir
 */
export function isGMInstructionContent(content: string): boolean {
  const gmPatterns = [
    /GM Talimat/i,
    /İpuçları\/Çözümler/i,
    /DC\s*\d+/i,
    /Perception DC/i,
    /Investigation DC/i,
    /Arcana DC/i,
    /History DC/i,
    /Karakterizeler için/i,
    /Önemli saatler:/i,
    /Çoklu yaklaşım/i,
    /- Oyunculara .* verin/i,
    /- Bilgi ve iz sürme/i,
  ];

  return gmPatterns.some(pattern => pattern.test(content));
}

/**
 * AI yanıtından GM talimatlarını ve meta-bilgileri temizler
 * Oyuncuya sadece hikaye anlatımı gösterilmeli
 */
function cleanGMInstructions(content: string): string {
  // Satır satır işle
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let skipSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Bölüm başlıklarını tespit et ve atla
    if (/^(GM Talimat|Sahne:|Başlangıç talimat|Anahtar ipuç|Çoklu yaklaşım|Ritüel ve çözüm|GM İçin|Bitiş öneri|İpuçları|Mekanik)/i.test(trimmedLine)) {
      skipSection = true;
      continue;
    }
    
    // DC değerleri içeren satırları atla
    if (/DC\s*\d+/i.test(trimmedLine)) {
      continue;
    }
    
    // Madde işaretli talimat satırlarını atla
    if (/^[-•]\s*(Oyunculara|Bilgi ve iz|Diplomasi:|Gizlilik:|Mücadele:|Yıkım:|Arındırma:|Kullanma:)/i.test(trimmedLine)) {
      continue;
    }
    
    // Stat block referanslarını atla
    if (/stat block|Wolf|Cult Fanatic/i.test(trimmedLine)) {
      continue;
    }
    
    // Boş satırda bölüm atlama modunu kapat
    if (trimmedLine === '' && skipSection) {
      skipSection = false;
      continue;
    }
    
    // Bölüm atlama modundaysak devam et
    if (skipSection) {
      continue;
    }
    
    // Normal satırları ekle
    if (trimmedLine) {
      cleanedLines.push(line);
    }
  }
  
  // Sonucu birleştir ve temizle
  let result = cleanedLines.join('\n').trim();
  
  // Kalan meta-kalıpları temizle
  result = result
    .replace(/\*\*Sahne betimlemesi:\*\*/gi, '')
    .replace(/Sahne betimlemesi:/gi, '')
    .replace(/\*\*GM Talimatları ve Sahne:\*\*/gi, '')
    .replace(/GM Talimatları ve Sahne:/gi, '')
    .replace(/\(stat block:.*?\)/gi, '')
    .replace(/\(DC\s*\d+\)/gi, '')
    .replace(/DC\s*\d+/gi, '')
    .trim();
  
  return result;
}
