import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/server';
import { generateLocationImage, getLocationStyleHints } from '@/lib/ai/imageGenerator';

/**
 * POST /api/gm/generate-location-image
 * Mekan görseli üretme endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      sessionId, 
      locationName, 
      locationType, 
      description, 
      createMessage, 
      messageContent, 
      excludeFromContext 
    } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { message: 'sessionId gerekli' },
        { status: 400 }
      );
    }

    if (!locationName || !description) {
      return NextResponse.json(
        { message: 'locationName ve description gerekli' },
        { status: 400 }
      );
    }

    // Auth kontrolü
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Session kontrolü
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          select: {
            creatorId: true,
            players: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { message: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü
    const isCreator = session.campaign.creatorId === userId;
    const isPlayer = session.campaign.players.some(p => p.userId === userId);

    if (!isCreator && !isPlayer) {
      return forbiddenResponse('Bu session\'a erişim yetkiniz yok');
    }

    // Stil ipuçları ekle
    const styleHints = getLocationStyleHints(locationType || 'other');
    const fullPrompt = `${description}. ${styleHints}`;

    console.log(`[LocationImage API] Generating image for: ${locationName}`);
    console.log(`[LocationImage API] Type: ${locationType}, Prompt length: ${fullPrompt.length}`);

    // Görsel üret
    const result = await generateLocationImage(fullPrompt, locationType || 'other');

    console.log(`[LocationImage API] Result:`, { success: result.success, hasUrl: !!result.imageUrl, error: result.error });

    if (!result.success) {
      console.error(`[LocationImage API] Failed:`, result.error);
      return NextResponse.json(
        { 
          success: false,
          message: result.error || 'Görsel üretilemedi' 
        },
        { status: 500 }
      );
    }

    // Session'ın currentState'ini güncelle (lokasyon bilgisi ve görsel URL'i)
    const currentState = session.currentState ? 
      (typeof session.currentState === 'string' ? JSON.parse(session.currentState) : session.currentState) : 
      {};

    const updatedState = {
      ...currentState,
      location: locationName,
      locationType: locationType || 'other',
      locationImage: result.imageUrl,
      locationImagePrompt: description,
    };

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentState: JSON.stringify(updatedState),
        updatedAt: new Date(),
      },
    });

    let imageMessage = null;
    if (createMessage) {
      const safeContent = typeof messageContent === 'string' && messageContent.trim().length > 0
        ? messageContent.trim()
        : `Scene image: ${locationName}`;
      const metadata = {
        isImageMessage: true,
        excludeFromContext: excludeFromContext !== false,
      };

      imageMessage = await prisma.message.create({
        data: {
          sessionId,
          senderType: 'GM',
          senderName: 'Game Master',
          content: safeContent,
          locationImageUrl: result.imageUrl,
          locationName,
          metadata: JSON.stringify(metadata),
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt,
      location: {
        name: locationName,
        type: locationType,
        description: description,
      },
      message: imageMessage ? {
        id: imageMessage.id,
        sessionId: imageMessage.sessionId,
        senderId: imageMessage.senderId,
        senderType: imageMessage.senderType,
        senderName: imageMessage.senderName,
        content: imageMessage.content,
        metadata: imageMessage.metadata ? JSON.parse(imageMessage.metadata) : undefined,
        locationImageUrl: imageMessage.locationImageUrl,
        locationName: imageMessage.locationName,
        timestamp: imageMessage.timestamp,
      } : undefined,
    });

  } catch (error) {
    console.error('Generate location image error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}
