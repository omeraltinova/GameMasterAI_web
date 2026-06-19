import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// SENARYOLARI LİSTELE
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "GET:/api/admin/scenarios", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

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

    const limited = await rateLimitResponse(session.user.id, "DELETE:/api/admin/scenarios", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

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

    const limited = await rateLimitResponse(session.user.id, "PATCH:/api/admin/scenarios", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const body = await req.json();
    const { id, isOfficial, isFeatured, difficulty, tags } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof isOfficial === "boolean") {
      updateData.isOfficial = isOfficial;
    }

    if (typeof isFeatured === "boolean") {
      updateData.isFeatured = isFeatured;
    }

    if (typeof difficulty === "string" && difficulty.trim()) {
      updateData.difficulty = difficulty.trim();
    }

    let normalizedTags: string[] | null = null;
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        normalizedTags = tags
          .map((tag) => String(tag).trim())
          .filter(Boolean);
      } else if (typeof tags === "string") {
        normalizedTags = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else {
        return NextResponse.json({ error: "tags formatı geçersiz" }, { status: 400 });
      }
      updateData.tags = JSON.stringify(normalizedTags);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
    }

    const currentScenario = await prisma.scenario.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isOfficial: true,
        isFeatured: true,
        difficulty: true,
        tags: true,
      },
    });

    if (!currentScenario) {
      return NextResponse.json({ error: "Senaryo bulunamadı" }, { status: 404 });
    }

    const scenario = await prisma.scenario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        isOfficial: true,
        isFeatured: true,
        difficulty: true,
        tags: true,
      },
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (typeof isOfficial === "boolean") {
      changes.isOfficial = { from: currentScenario.isOfficial, to: isOfficial };
    }
    if (typeof isFeatured === "boolean") {
      changes.isFeatured = { from: currentScenario.isFeatured, to: isFeatured };
    }
    if (typeof difficulty === "string" && difficulty.trim()) {
      changes.difficulty = { from: currentScenario.difficulty, to: difficulty.trim() };
    }
    if (normalizedTags) {
      let currentTags: string[] = [];
      if (currentScenario.tags) {
        try {
          currentTags = typeof currentScenario.tags === "string"
            ? JSON.parse(currentScenario.tags)
            : (currentScenario.tags as string[]);
        } catch {
          currentTags = [];
        }
      }
      changes.tags = { from: currentTags, to: normalizedTags };
    }

    await logAdminAction({
      adminId: session.user.id,
      action: Object.keys(changes).length === 1 && changes.isOfficial
        ? "SCENARIO_OFFICIAL_TOGGLE"
        : "SCENARIO_CURATION_UPDATE",
      entityType: "Scenario",
      entityId: id,
      metadata: {
        title: currentScenario.title,
        changes,
      },
    });

    return NextResponse.json({ success: true, scenario });
  } catch (error) {
    console.error("Senaryo güncelleme hatası:", error);
    return NextResponse.json({ error: "Güncelleme işlemi başarısız" }, { status: 500 });
  }
}
