import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateLocationImage } from '@/lib/ai/imageGenerator';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { checkAIRateLimit } from '@/lib/security/aiRateLimit';
import { normalizeImageUrl } from '@/lib/security/imageUrl';

// Harita stili prompt ekleri
const MAP_STYLE_PROMPTS: Record<string, string> = {
  topdown: 'Top-down bird\'s eye view, detailed floor plan style, clear room layouts, doors and corridors visible',
  region: 'Regional fantasy map style, parchment texture, mountain ranges, forests, rivers, settlements marked with icons, compass rose',
  city: 'City map style, detailed street layout, buildings from above, market squares, city walls, districts labeled',
  dungeon: 'Dungeon map style, grid-based floor plan, rooms connected by corridors, secret doors, trap locations marked, treasure rooms',
  battle: 'Tactical battle map, grid overlay, terrain features clearly marked, cover positions, elevation changes, strategic points',
};

// Lokasyon tipi için harita stil önerileri
const getMapStyleHints = (locationType: string, mapStyle: string): string => {
  const baseStyle = MAP_STYLE_PROMPTS[mapStyle] || MAP_STYLE_PROMPTS.topdown;
  
  const locationHints: Record<string, string> = {
    dungeon: 'dark stone corridors, torch sconces, ancient architecture',
    tavern: 'wooden interior, bar area, tables, fireplace, kitchen, upstairs rooms',
    forest: 'tree canopy from above, clearings, paths, streams, wildlife dens',
    cave: 'natural rock formations, stalactites, underground pools, narrow passages',
    castle: 'fortified walls, towers, courtyard, great hall, armory, dungeons',
    town: 'town square, shops, residential areas, temple, inn, town gates',
    port: 'docks, warehouses, ships, lighthouse, fishing areas, harbor master',
    camp: 'tents arrangement, campfire, supply area, guard posts, perimeter',
    temple: 'altar, prayer halls, clergy quarters, sacred chambers, catacombs',
    battlefield: 'terrain elevation, defensive positions, supply lines, command posts',
    mountain: 'peaks, valleys, passes, caves, scenic overlooks, climbing routes',
  };

  const locationHint = locationHints[locationType] || '';
  
  return `${baseStyle}. ${locationHint}`.trim();
};

/**
 * POST /api/gm/generate-map
 * AI ile harita görseli oluşturma endpoint'i
 * Gerçek görsel üretir ve Map tablosuna kaydeder
 */
export async function POST(req: NextRequest) {
  try {
    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const rateLimit = await checkAIRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'AI istek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { sessionId, locationName, locationType, mapStyle, atmosphere, details } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID gerekiyor' },
        { status: 400 }
      );
    }

    if (!locationName || typeof locationName !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Lokasyon adı gerekiyor' },
        { status: 400 }
      );
    }

    if (!locationType || typeof locationType !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Lokasyon türü gerekiyor' },
        { status: 400 }
      );
    }

    // Session'ı kontrol et
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            players: true,
            scenario: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        { success: false, message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    const hasAccess = gameSession.campaign.creatorId === userId ||
      gameSession.campaign.players.some((p) => p.userId === userId);

    if (!hasAccess) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Harita stili
    const selectedMapStyle = mapStyle || 'topdown';
    const styleHints = getMapStyleHints(locationType, selectedMapStyle);
    
    // Prompt oluştur - harita odaklı
    const promptParts: string[] = [
      `Fantasy RPG map illustration for tabletop gaming`,
      `Location: "${locationName}"`,
      `Location type: ${locationType}`,
      styleHints,
    ];

    if (atmosphere) {
      const atmosphereDescriptions: Record<string, string> = {
        mysterious: 'mysterious fog, hidden areas, unknown passages',
        dark: 'dark shadows, minimal light sources, ominous corners',
        peaceful: 'warm lighting, welcoming atmosphere, safe zones',
        dangerous: 'hazard markers, trap indicators, enemy positions',
        ancient: 'weathered textures, crumbling sections, historical markers',
        magical: 'glowing runes, magical circles, enchanted areas',
        abandoned: 'debris, overgrown areas, collapsed sections',
        lively: 'populated areas, busy streets, active zones',
        eerie: 'unsettling shadows, strange formations, creepy details',
        sacred: 'holy symbols, blessed grounds, divine light sources',
      };
      promptParts.push(`Atmosphere: ${atmosphereDescriptions[atmosphere] || atmosphere}`);
    }

    if (details && Array.isArray(details) && details.length > 0) {
      promptParts.push(`Key locations to include: ${details.join(', ')}`);
    }

    // Scenario context ekle
    if (gameSession.campaign.scenario?.title) {
      promptParts.push(`Setting: ${gameSession.campaign.scenario.title}`);
    }

    // Final prompt - harita odaklı
    const styleLabelMap: Record<string, string> = {
      topdown: 'top-down floor plan',
      region: 'regional fantasy map',
      city: 'city street map',
      dungeon: 'dungeon floor plan',
      battle: 'tactical battle map',
    };
    const styleLabel = styleLabelMap[selectedMapStyle] || 'top-down map';

    const fullPrompt = `${promptParts.join('. ')}. Style: ${styleLabel}, high detail, clear labels, professional cartography, suitable for tabletop RPG use.`;

    console.log(`[GenerateMap] Generating map for: ${locationName}`);
    console.log(`[GenerateMap] Style: ${selectedMapStyle}, Type: ${locationType}`);
    console.log(`[GenerateMap] Prompt: ${fullPrompt.substring(0, 200)}...`);

    // AI ile görsel üret
    const result = await generateLocationImage(fullPrompt, locationType);

    console.log(`[GenerateMap] Result:`, { success: result.success, hasUrl: !!result.imageUrl, error: result.error });

    if (!result.success || !result.imageUrl) {
      console.error(`[GenerateMap] Failed:`, result.error);
      return NextResponse.json(
        { 
          success: false,
          message: result.error || 'Harita görseli üretilemedi' 
        },
        { status: 500 }
      );
    }

    const normalizedImageUrl = normalizeImageUrl(result.imageUrl);
    if (!normalizedImageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'Üretilen harita görsel URL’i güvenlik kurallarını karşılamıyor',
        },
        { status: 502 }
      );
    }

    // Stil etiketi
    const styleLabels: Record<string, string> = {
      topdown: 'Tepeden Bakış',
      region: 'Bölge Haritası',
      city: 'Şehir Planı',
      dungeon: 'Zindan Haritası',
      battle: 'Savaş Haritası',
    };

    // Haritayı veritabanına kaydet
    const map = await prisma.map.create({
      data: {
        sessionId,
        name: locationName,
        description: `${styleLabels[selectedMapStyle] || 'Harita'} - ${locationType}${atmosphere ? ` (${atmosphere})` : ''}`,
        imageUrl: normalizedImageUrl,
        isAIGenerated: true,
        prompt: fullPrompt,
      },
    });

    return NextResponse.json({
      success: true,
      map: {
        id: map.id,
        sessionId: map.sessionId,
        name: map.name,
        description: map.description,
        imageUrl: map.imageUrl,
        isAIGenerated: map.isAIGenerated,
        prompt: map.prompt,
        createdAt: map.createdAt.toISOString(),
      },
      revisedPrompt: result.revisedPrompt,
    });
  } catch (error) {
    console.error('Map generation error:', error);
    return NextResponse.json(
      { success: false, message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
