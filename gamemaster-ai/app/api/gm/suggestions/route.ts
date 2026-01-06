import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIResponseWithContext } from '@/lib/ai/openrouter';
import { getUserId } from '@/lib/auth/server';

/**
 * Suggestions için özel system prompt - farklı bakış açısı için
 */
const SUGGESTIONS_SYSTEM_PROMPT = `Sen bir D&D oyun asistanısın. Oyuncuya mevcut duruma göre yaratıcı aksiyon önerileri sunuyorsun.

**Görevin:**
- Oyuncunun yapabileceği ilginç ve yaratıcı aksiyonlar öner
- Her öneri farklı bir oyun tarzını temsil etsin (combat, diplomacy, stealth, exploration, vb.)
- Öneriler kısa ve anlaşılır olsun
- D&D 5e kurallarına uygun öneriler sun

**Kurallar:**
- Türkçe yanıt ver
- Her öneri için kısa bir özet ve detaylı bir aksiyon metni oluştur
- 3-4 farklı öneri sun
- Öneriler mevcut duruma uygun ve mantıklı olsun`;

/**
 * POST /api/gm/suggestions
 * Oyuncuya aksiyon önerileri sunar - ayrı context ile
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId, lastGMMessage } = body;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    // Session'ı kontrol et - minimal veri çek
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        currentState: true,
        campaign: {
          select: {
            creatorId: true,
            players: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!gameSession) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = gameSession.campaign.creatorId === userId;
    const isPlayer = gameSession.campaign.players.some(
      (player: any) => player.userId === userId
    );

    if (!isCreator && !isPlayer) {
      return NextResponse.json(
        { message: 'Bu session\'a erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Minimal context oluştur - sadece son GM mesajı ve lokasyon
    let location = 'Bilinmeyen';
    let worldContext = '';

    if (gameSession.currentState) {
      try {
        const state = typeof gameSession.currentState === 'string'
          ? JSON.parse(gameSession.currentState)
          : gameSession.currentState;

        location = state.location || state.worldSettings?.startingLocation?.name || 'Bilinmeyen';

        if (state.worldSettings) {
          worldContext = `Dünya: ${state.worldSettings.worldName || ''}, Ton: ${state.worldSettings.tone || ''}`;
        }
      } catch (e) {
        console.error('State parse error:', e);
      }
    }

    // Suggestions prompt - hafif context
    const contextPrompt = `**Mevcut Lokasyon:** ${location}
${worldContext ? `**${worldContext}**\n` : ''}
**Son GM Mesajı:**
${lastGMMessage || 'Macera başlıyor...'}`;

    const userPrompt = `Yukarıdaki duruma göre oyuncunun yapabileceği 3-4 farklı aksiyon öner.

Yanıtını aşağıdaki JSON formatında ver:
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "shortLabel": "🗡️ Saldır",
      "detailedAction": "Kılıcımı çekerek düşmana doğru hamle yapıyorum"
    },
    {
      "id": "suggestion_2", 
      "shortLabel": "🔍 Araştır",
      "detailedAction": "Etrafı dikkatli bir şekilde inceliyorum, gizli kapılar veya tuzaklar arıyorum"
    }
  ]
}

**Önemli:**
- shortLabel: Butonda gözükecek kısa özet (emoji + 2-3 kelime)
- detailedAction: Tıklandığında gönderilecek detaylı aksiyon metni
- Her öneri farklı bir yaklaşımı temsil etsin (savaş, diplomasi, gizlilik, keşif, vb.)
- Duruma uygun ve mantıklı öneriler sun`;

    const aiResponse = await getAIResponseWithContext(
      SUGGESTIONS_SYSTEM_PROMPT,
      contextPrompt,
      userPrompt,
      {
        temperature: 0.9, // Daha yaratıcı öneriler için
        maxTokens: 10000,  // Öneri yanıtları için yeterli
      }
    );

    // JSON parse et
    let suggestions: Array<{
      id: string;
      shortLabel: string;
      detailedAction: string;
    }> = [];

    try {
      let jsonContent = aiResponse;

      // Markdown code block içindeki JSON'ı çıkar (```json ... ```)
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }

      // JSON objesini bul 
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Temel temizlik - sadece syntax bozan bariz hataları düzelt
        // Trailing comma'ları kaldır (JSON standardında yasak)
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions.map((s: any, index: number) => ({
              id: s.id || `suggestion_${Date.now()}_${index}`,
              shortLabel: s.shortLabel || 'Aksiyon',
              detailedAction: s.detailedAction || s.shortLabel || 'Aksiyon yap',
            }));
          }
        } catch (innerError) {
          // İlk parse başarısız olduysa, suggestions array'ini regex ile bulmaya çalış
          console.warn('First JSON parse failed, trying regex extraction', innerError);

          const suggestionsMatch = aiResponse.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);
          if (suggestionsMatch) {
            // Her suggestion objesini ayrı ayrı parse etmeye çalış
            const suggestionObjects = suggestionsMatch[1].match(/\{[^{}]*\}/g);
            if (suggestionObjects) {
              suggestionObjects.forEach((objStr, index) => {
                try {
                  // Obje içindeki basit syntax hatalarını düzelt
                  let cleanedStr = objStr.replace(/,\s*}/g, '}');
                  // Key'leri quote içine al (eğer eksikse)
                  cleanedStr = cleanedStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

                  const obj = JSON.parse(cleanedStr);
                  if (obj.shortLabel || obj.detailedAction) {
                    suggestions.push({
                      id: obj.id || `suggestion_${Date.now()}_${index}`,
                      shortLabel: obj.shortLabel || 'Aksiyon',
                      detailedAction: obj.detailedAction || obj.shortLabel || 'Aksiyon yap',
                    });
                  }
                } catch {
                  // Tek obje parse edilemedi, atla
                }
              });
            }
          }

          if (suggestions.length === 0) {
            throw innerError; // Hala bulamadıysak hata fırlat
          }
        }
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('Suggestions parse error:', parseError);
      // Fallback öneriler
      suggestions = [
        { id: 'fallback_1', shortLabel: '🔍 Etrafı incele', detailedAction: 'Etrafı dikkatli bir şekilde inceliyorum' },
        { id: 'fallback_2', shortLabel: '💬 Konuş', detailedAction: 'Birisiyle konuşmaya çalışıyorum' },
        { id: 'fallback_3', shortLabel: '🚶 İlerle', detailedAction: 'Dikkatli bir şekilde ilerliyorum' },
      ];
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
