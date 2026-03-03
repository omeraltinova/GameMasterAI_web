import { NextRequest, NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai/openrouter';
import { CHARACTER_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { getUserId } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';

const VALID_RACES = ["Human", "Elf", "Dwarf", "Halfling", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"];
const VALID_CLASSES = ["Fighter", "Wizard", "Rogue", "Cleric", "Ranger", "Paladin", "Barbarian", "Bard", "Druid", "Monk", "Sorcerer", "Warlock"];
const VALID_BACKGROUNDS = ["Acolyte", "Criminal", "Folk Hero", "Noble", "Sage", "Soldier", "Entertainer", "Guild Artisan", "Hermit", "Outlander"];

/**
 * POST /api/gm/generate-character
 * AI karakter oluşturma endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { race, characterClass, concept, appearance: requestedAppearance } = body;

    // User prompt oluştur
    let userPrompt = `Yeni bir 5e SRD karakter oluştur.\n`;

    if (race) {
      userPrompt += `**Irk tercihi:** ${race}\n`;
    }

    if (characterClass) {
      userPrompt += `**Sınıf tercihi:** ${characterClass}\n`;
    }

    if (concept) {
      userPrompt += `**Karakter konsepti:** ${concept}\n`;
    }

    if (requestedAppearance) {
      userPrompt += `**Görünüş:** ${requestedAppearance}\n`;
    }

    if (!race && !characterClass && !concept) {
      userPrompt += `Tamamen rastgele, yaratıcı ve ilgi çekici bir karakter oluştur.\n`;
    }

    userPrompt += `\nYanıtı JSON formatında ver ve doğrudan parse edilebilir olsun.`;

    // AI'dan yanıt al
    const aiResponse = await getAIResponse(
      CHARACTER_GENERATION_PROMPT,
      userPrompt,
      {
        temperature: 0.9,
        maxTokens: 2000,
        userId,
      }
    );

    // JSON parse et
    let characterData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        characterData = JSON.parse(jsonMatch[0]);
      } else {
        characterData = JSON.parse(aiResponse);
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      return NextResponse.json(
        { success: false, error: 'AI yanıtını işlerken hata oluştu', rawResponse: aiResponse },
        { status: 500 }
      );
    }

    // Validate ve normalize et
    const charRace = VALID_RACES.includes(characterData.race) ? characterData.race : (race || "Human");
    const charClass = VALID_CLASSES.includes(characterData.class) ? characterData.class : (characterClass || "Fighter");
    const charBg = VALID_BACKGROUNDS.includes(characterData.background) ? characterData.background : "Folk Hero";

    // Stats normalize et (3-18 aralığında)
    const clampStat = (val: number) => Math.max(3, Math.min(18, Math.round(val || 10)));
    const stats = characterData.stats ? {
      strength: clampStat(characterData.stats.strength),
      dexterity: clampStat(characterData.stats.dexterity),
      constitution: clampStat(characterData.stats.constitution),
      intelligence: clampStat(characterData.stats.intelligence),
      wisdom: clampStat(characterData.stats.wisdom),
      charisma: clampStat(characterData.stats.charisma),
    } : {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    };

    return NextResponse.json({
      success: true,
      character: {
        name: characterData.name || 'Adsız Kahraman',
        race: charRace,
        class: charClass,
        background: charBg,
        appearance: typeof characterData.appearance === 'string' ? characterData.appearance : '',
        backstory: characterData.backstory || '',
        stats,
      },
    });
  } catch (error) {
    console.error('Character generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
