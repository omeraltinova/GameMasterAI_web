import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

// KULLANICI GÜNCELLEME (PATCH)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;
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
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.username,
        email: updatedUser.email,
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
