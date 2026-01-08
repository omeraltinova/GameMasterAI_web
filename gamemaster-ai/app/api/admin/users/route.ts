import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

// KULLANICILARI LİSTELE
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { characters: true, campaigns: true },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Kullanıcılar alınamadı" }, { status: 500 });
  }
}

// ROL GÜNCELLE (PATCH)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { userId, role } = await req.json();

    // Kendini adminlikten çıkarmayı engelle
    if (userId === session.user.id && role !== "ADMIN") {
      return NextResponse.json({ error: "Kendi yetkinizi alamazsınız." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

// KULLANICI SİL (DELETE)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "Kendinizi silemezsiniz." }, { status: 400 });
    }

    // İlişkileri temizle (Transaction)
    await prisma.$transaction(async (tx) => {
      await tx.message.updateMany({ where: { senderId: userId }, data: { senderId: null, senderName: "Silinmiş Kullanıcı" } });
      await tx.scenario.updateMany({ where: { creatorId: userId }, data: { creatorId: null } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}