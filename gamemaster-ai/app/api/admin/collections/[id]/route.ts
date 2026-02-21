import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { normalizeScenarioIds } from "@/lib/admin/utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, scenarioIds } = body ?? {};

    const normalizedIds = normalizeScenarioIds(scenarioIds);
    if (normalizedIds === null) {
      return NextResponse.json({ error: "scenarioIds formatı geçersiz" }, { status: 400 });
    }

    if (
      (name === undefined || name === null) &&
      description === undefined &&
      normalizedIds === undefined
    ) {
      return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
    }

    const existing = await prisma.scenarioCollection.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof name === "string") {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = typeof description === "string" && description.trim()
        ? description.trim()
        : null;
    }
    if (normalizedIds !== undefined) {
      updateData.items = {
        deleteMany: {},
        create: normalizedIds.map((scenarioId, index) => ({
          scenarioId,
          position: index,
        })),
      };
    }

    const updated = await prisma.scenarioCollection.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            scenario: { select: { id: true, title: true } },
          },
        },
      },
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "COLLECTION_UPDATE",
      entityType: "ScenarioCollection",
      entityId: id,
      metadata: {
        name: updated.name,
        scenarioCount: updated.items.length,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      scenarios: updated.items.map((item) => item.scenario),
      scenarioIds: updated.items.map((item) => item.scenarioId),
    });
  } catch (error) {
    console.error("Koleksiyon güncelleme hatası:", error);
    return NextResponse.json({ error: "Koleksiyon güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.scenarioCollection.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı" }, { status: 404 });
    }

    await prisma.scenarioCollection.delete({ where: { id } });

    await logAdminAction({
      adminId: session.user.id,
      action: "COLLECTION_DELETE",
      entityType: "ScenarioCollection",
      entityId: id,
      metadata: {
        name: existing.name,
        scenarioCount: existing.items.length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Koleksiyon silme hatası:", error);
    return NextResponse.json({ error: "Koleksiyon silinemedi" }, { status: 500 });
  }
}
