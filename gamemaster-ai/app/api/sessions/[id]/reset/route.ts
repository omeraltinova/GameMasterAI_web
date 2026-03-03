import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId, unauthorizedResponse } from '@/lib/auth/server';

/**
 * POST /api/sessions/:id/reset
 * Session'ı sıfırla veya belirli bir mesajdan itibaren sil
 * 
 * Body:
 * - type: "full" | "from_message"
 * - messageId?: string (type === "from_message" için gerekli)
 * - keepWorldSettings?: boolean (varsayılan: true)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const { type, messageId, keepWorldSettings = true } = body;

    // Session'ı kontrol et
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            players: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Yetki kontrolü - sadece campaign creator sıfırlayabilir
    const isCreator = session.campaign.creatorId === userId;
    if (!isCreator) {
      return NextResponse.json(
        { success: false, error: 'Sadece oturum yaratıcısı oyunu sıfırlayabilir' },
        { status: 403 }
      );
    }

    if (type === 'full') {
      // Tam sıfırlama - tüm mesajları sil
      await prisma.message.deleteMany({
        where: { sessionId },
      });

      // Session state'i sıfırla
      const newState: any = {
        location: 'Başlangıç',
        timeOfDay: 'morning',
        weather: 'clear',
        activeNPCs: [],
        activeQuests: [],
        notes: '',
      };

      // Eğer world settings korunacaksa, mevcut state'den al
      if (keepWorldSettings && session.currentState) {
        try {
          const currentState = typeof session.currentState === 'string' 
            ? JSON.parse(session.currentState) 
            : session.currentState;
          
          if (currentState.worldSettings) {
            newState.worldSettings = currentState.worldSettings;
            newState.location = currentState.worldSettings.startingLocation?.name || 'Başlangıç';
          }
        } catch (e) {
          console.error('State parse error:', e);
        }
      }

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          currentState: JSON.stringify(newState),
          updatedAt: new Date(),
        },
      });

      // Hoş geldin mesajı ekle
      const welcomeMessage = await prisma.message.create({
        data: {
          sessionId,
          senderType: 'SYSTEM',
          senderName: 'Sistem',
          content: '🔄 Oyun sıfırlandı. Yeni bir maceraya hazır mısın?',
        },
      });

      // Eğer world settings korunuyorsa ve openingNarration varsa, GM açılış mesajı ekle
      let openingMessage = null;
      if (keepWorldSettings && newState.worldSettings?.openingNarration) {
        openingMessage = await prisma.message.create({
          data: {
            sessionId,
            senderType: 'GM',
            senderName: 'Game Master',
            content: newState.worldSettings.openingNarration,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Oyun başarıyla sıfırlandı',
        resetType: 'full',
        newMessage: welcomeMessage,
        openingMessage: openingMessage,
      });

    } else if (type === 'from_message') {
      // Belirli bir mesajdan itibaren sil
      if (!messageId) {
        return NextResponse.json(
          { success: false, error: 'messageId gerekli' },
          { status: 400 }
        );
      }

      // Hedef mesajı bul
      const targetMessage = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!targetMessage || targetMessage.sessionId !== sessionId) {
        return NextResponse.json(
          { success: false, error: 'Mesaj bulunamadı' },
          { status: 404 }
        );
      }

      // Bu mesajdan sonraki tüm mesajları sil
      const deletedMessages = await prisma.message.deleteMany({
        where: {
          sessionId,
          timestamp: {
            gt: targetMessage.timestamp,
          },
        },
      });

      // Sistem mesajı ekle
      const restartMessage = await prisma.message.create({
        data: {
          sessionId,
          senderType: 'SYSTEM',
          senderName: 'Sistem',
          content: '⏪ Oyun bu noktadan yeniden başlatıldı.',
        },
      });

      // Session'ı güncelle
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${deletedMessages.count} mesaj silindi`,
        resetType: 'from_message',
        fromMessageId: messageId,
        deletedCount: deletedMessages.count,
        newMessage: restartMessage,
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Geçersiz reset tipi. "full" veya "from_message" kullanın.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Session reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}


