import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { username: true, email: true } },
        _count: { select: { players: true, sessions: true } },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    return NextResponse.json({ error: "Kampanyalar alınamadı" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}