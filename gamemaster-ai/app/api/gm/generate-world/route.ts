import { NextRequest, NextResponse } from 'next/server';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { getUserId } from '@/lib/auth/server';

/**
 * POST /api/gm/generate-world
 * Dünya/Evren ayarları için AI önerisi oluşturur
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      campaignName,
      campaignDescription,
      worldType,
      userInput,
      currentSettings 
    } = body;

    // Kullanıcı girişine göre prompt oluştur
    let userPrompt = '';
    
    if (userInput) {
      // Kullanıcı bir şey yazdıysa, onu geliştir
      userPrompt = `Kullanıcı şu dünya fikrini paylaştı: "${userInput}"

Bu fikri geliştir ve detaylandır. Şu bilgileri içeren zengin bir dünya tanımı oluştur:`;
    } else if (currentSettings) {
      // Mevcut ayarları iyileştir
      userPrompt = `Mevcut dünya ayarları:
${JSON.stringify(currentSettings, null, 2)}

Bu ayarları daha detaylı ve ilgi çekici hale getir:`;
    } else {
      // Sıfırdan öner
      userPrompt = `"${campaignName}" adlı bir D&D kampanyası için dünya ayarları öner.
${campaignDescription ? `Kampanya açıklaması: ${campaignDescription}` : ''}
${worldType ? `İstenen dünya tipi: ${worldType}` : ''}

Yaratıcı ve ilgi çekici bir dünya tasarla:`;
    }

    const systemPrompt = `Sen yaratıcı bir D&D Game Master'sın. Görevin oyuncular için ilgi çekici ve sürükleyici dünya ayarları oluşturmak.

GÖREV: Bir D&D kampanyası için dünya ayarları oluştur.

ÇIKTI FORMATI: Aşağıdaki JSON formatında yanıt ver (sadece JSON, başka bir şey yazma):
{
  "worldName": "Dünyanın adı",
  "worldType": "fantasy|sci-fi|horror|historical|steampunk",
  "setting": "Genel dünya tanımı (2-3 cümle)",
  "era": "Çağ/Dönem açıklaması",
  "startingLocation": {
    "name": "Başlangıç lokasyonu adı",
    "description": "Detaylı lokasyon açıklaması (3-4 cümle)",
    "atmosphere": "Atmosfer/ruh hali"
  },
  "tone": "serious|comedic|dark|epic|mysterious",
  "mainConflict": "Ana çatışma/tehdit (1-2 cümle)",
  "uniqueElements": ["Özel element 1", "Özel element 2", "Özel element 3"],
  "factions": [
    {"name": "Grup adı", "description": "Kısa açıklama", "alignment": "friendly|neutral|hostile"}
  ],
  "hooks": ["Hikaye kancası 1", "Hikaye kancası 2"],
  "openingNarration": "Oyunun başlangıç anlatısı - atmosferik ve çekici (4-6 cümle)"
}

ÖNEMLİ:
- Türkçe yaz
- Yaratıcı ve özgün ol
- D&D 5e kurallarına uygun ol
- Sadece JSON döndür, açıklama ekleme`;

    const aiResponse = await getAIResponseWithContext(
      systemPrompt,
      '',
      userPrompt,
      {
        temperature: 0.9,
      }
    );

    // JSON parse et
    let worldSettings;
    try {
      // AI bazen ```json ... ``` formatında dönebilir, temizle
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      worldSettings = JSON.parse(cleanResponse.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Parse hatası olursa varsayılan yapı dön
      worldSettings = {
        worldName: campaignName || 'Gizemli Diyarlar',
        worldType: worldType || 'fantasy',
        setting: 'Büyülü yaratıkların ve antik güçlerin hüküm sürdüğü bir dünya.',
        era: 'Orta Çağ Fantezi Dönemi',
        startingLocation: {
          name: 'Başlangıç Köyü',
          description: 'Küçük ama huzurlu bir köy. Maceraperestlerin yollarının sık sık kesiştiği bir yer.',
          atmosphere: 'Huzurlu ama gizemli'
        },
        tone: 'epic',
        mainConflict: 'Kadim bir kötülük uyanmak üzere.',
        uniqueElements: ['Büyülü ormanlar', 'Antik kalıntılar', 'Ejderha efsaneleri'],
        factions: [
          { name: 'Köy Halkı', description: 'Dost canlısı yerli halk', alignment: 'friendly' }
        ],
        hooks: ['Kayıp bir hazine haritası', 'Gizemli yolcunun uyarısı'],
        openingNarration: aiResponse.substring(0, 500)
      };
    }

    return NextResponse.json({
      success: true,
      worldSettings,
      rawResponse: aiResponse
    });
  } catch (error) {
    console.error('Generate world error:', error);
    return NextResponse.json(
      { message: 'Dünya oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

