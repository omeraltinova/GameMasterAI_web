import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

// KULLANICI BİLGİLERİ (GET) — gizlilik ayarları dahil
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        profilePublic: true,
        showCharacters: true,
        showCampaigns: true,
        showScenarios: true,
        showStats: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profil bilgileri hatası:", error);
    return NextResponse.json(
      { error: "Profil bilgileri alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

// KULLANICI GÜNCELLEME (PATCH) — gizlilik ayarları dahil
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
    }

    const body = await req.json();
    const { name, privacy } = body;
    const data: Record<string, unknown> = {};

    if (typeof name === "string") {
      if (name.trim().length < 3) {
        return NextResponse.json(
          { error: "Kullanıcı adı en az 3 karakter olmalıdır." },
          { status: 400 }
        );
      }

      // Kullanıcı adı değişmişse, başkası tarafından kullanılıyor mu kontrol et
      if (name !== session.user.name) {
        const existingUser = await prisma.user.findUnique({
          where: { username: name },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Bu kullanıcı adı zaten kullanımda." },
            { status: 409 }
          );
        }
      }

      data.username = name;
    }

    // Gizlilik ayarları
    if (privacy && typeof privacy === "object") {
      const booleanFields = [
        "profilePublic",
        "showCharacters",
        "showCampaigns",
        "showScenarios",
        "showStats",
      ] as const;

      for (const field of booleanFields) {
        if (typeof privacy[field] === "boolean") {
          data[field] = privacy[field];
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek veri bulunamadı." },
        { status: 400 }
      );
    }

    // Güncelleme işlemi
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data,
      select: {
        username: true,
        email: true,
        profilePublic: true,
        showCharacters: true,
        showCampaigns: true,
        showScenarios: true,
        showStats: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.username,
        email: updatedUser.email,
        privacy: {
          profilePublic: updatedUser.profilePublic,
          showCharacters: updatedUser.showCharacters,
          showCampaigns: updatedUser.showCampaigns,
          showScenarios: updatedUser.showScenarios,
          showStats: updatedUser.showStats,
        },
      },
    });
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Profil güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

// HESAP SİLME (DELETE)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
    }

    const userId = session.user.id;

    // Transaction kullanarak ilişkisel veri bütünlüğünü koruyalım
    await prisma.$transaction(async (tx) => {
      // 1. Kullanıcının mesajlarını 'Anonim' yap (User silinince mesajlar kalsın ama kimin attığı null olsun)
      // veya isteğe bağlı silebilirsiniz. Burada null yapıyoruz.
      await tx.message.updateMany({
        where: { senderId: userId },
        data: { senderId: null, senderName: "Silinmiş Kullanıcı" },
      });

      // 2. Kullanıcının oluşturduğu senaryoları 'Anonim' yap
      await tx.scenario.updateMany({
        where: { creatorId: userId },
        data: { creatorId: null },
      });

      // 3. Kullanıcıyı sil (Character, Campaign, CampaignPlayer Cascade olduğu için otomatik silinir)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ success: true, message: "Hesap başarıyla silindi." });
  } catch (error) {
    console.error("Hesap silme hatası:", error);
    return NextResponse.json(
      { error: "Hesap silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
