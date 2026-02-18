import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';
import { characterCreateSchema } from '@/lib/validators/characters';

/**
 * GET /api/characters
 * Kullanıcının karakterleri endpoint'i
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    // Kullanıcının karakterlerini al
    const characters = await prisma.character.findMany({
      where: { userId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        inventoryItems: {
          take: 10,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      characters: characters.map((char) => {
        const characterAppearance =
          (char as unknown as { appearance?: string | null }).appearance ?? null;

        return {
          id: char.id,
          name: char.name,
          race: char.race,
          class: char.class,
          level: char.level,
          experience: char.experience,
          hp: char.hp,
          maxHp: char.maxHp,
          stats: JSON.parse(char.stats),
          background: char.background,
          appearance: characterAppearance,
          backstory: char.backstory,
          imageUrl: char.imageUrl,
          campaignId: char.campaignId,
          campaign: char.campaign,
          inventoryCount: char.inventoryItems.length,
          createdAt: char.createdAt,
          updatedAt: char.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('Characters get error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/characters
 * Yeni karakter oluştur endpoint'i
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
    const parsed = characterCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Gecersiz karakter verisi', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      race,
      class: characterClass,
      level,
      experience,
      hp,
      maxHp,
      stats,
      background,
      appearance,
      backstory,
      imageUrl,
    } = parsed.data;

    const createData: Parameters<typeof prisma.character.create>[0]['data'] & {
      appearance?: string | null;
    } = {
      userId,
      name,
      race,
      class: characterClass,
      level: level || 1,
      experience: experience || 0,
      hp: hp || 10,
      maxHp: maxHp || 10,
      stats: typeof stats === 'object'
        ? JSON.stringify(stats)
        : JSON.stringify({
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
          }),
      background,
      backstory,
      imageUrl,
    };

    if (appearance !== undefined) {
      createData.appearance = appearance;
    }

    // Yeni karakter oluştur
    const character = await prisma.character.create({
      data: createData as Parameters<typeof prisma.character.create>[0]['data'],
    });

    const characterAppearance =
      (character as unknown as { appearance?: string | null }).appearance ?? null;

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.name,
        race: character.race,
        class: characterClass,
        level: character.level,
        experience: character.experience,
        hp: character.hp,
        maxHp: character.maxHp,
        stats: JSON.parse(character.stats),
        background: character.background,
        appearance: characterAppearance,
        backstory: character.backstory,
        imageUrl: character.imageUrl,
        createdAt: character.createdAt,
      },
      message: 'Karakter başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Character creation error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
