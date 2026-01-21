import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";

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

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      select: { id: true, title: true, isOfficial: true },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Senaryo bulunamadı" }, { status: 404 });
    }

    // Senaryoyu sil
    await prisma.scenario.delete({
      where: { id },
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "SCENARIO_DELETE",
      entityType: "Scenario",
      entityId: id,
      metadata: {
        title: scenario.title,
        isOfficial: scenario.isOfficial,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Senaryo silme hatası:", error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}

// SENARYO GÜNCELLE (PATCH)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isOfficial } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    if (typeof isOfficial !== "boolean") {
      return NextResponse.json({ error: "isOfficial değeri gerekli" }, { status: 400 });
    }

    const currentScenario = await prisma.scenario.findUnique({
      where: { id },
      select: { id: true, title: true, isOfficial: true },
    });

    if (!currentScenario) {
      return NextResponse.json({ error: "Senaryo bulunamadı" }, { status: 404 });
    }

    const scenario = await prisma.scenario.update({
      where: { id },
      data: { isOfficial },
      select: {
        id: true,
        isOfficial: true,
      },
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "SCENARIO_OFFICIAL_TOGGLE",
      entityType: "Scenario",
      entityId: id,
      metadata: {
        title: currentScenario.title,
        from: currentScenario.isOfficial,
        to: isOfficial,
      },
    });

    return NextResponse.json({ success: true, scenario });
  } catch (error) {
    console.error("Senaryo güncelleme hatası:", error);
    return NextResponse.json({ error: "Güncelleme işlemi başarısız" }, { status: 500 });
  }
}
