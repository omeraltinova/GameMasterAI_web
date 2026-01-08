import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

// SENARYOLARI LİSTELE
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const scenarios = await prisma.scenario.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            username: true,
            email: true,
          },
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error("Senaryo getirme hatası:", error);
    return NextResponse.json({ error: "Senaryolar alınamadı" }, { status: 500 });
  }
}

// SENARYO SİL (DELETE)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    // Senaryoyu sil
    await prisma.scenario.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Senaryo silme hatası:", error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}