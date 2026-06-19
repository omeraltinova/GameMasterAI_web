import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { normalizeScenarioIds } from "@/lib/admin/utils";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "GET:/api/admin/collections", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const collections = await prisma.scenarioCollection.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            scenario: { select: { id: true, title: true } },
          },
        },
      },
    });

    const payload = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      scenarios: collection.items.map((item) => item.scenario),
      scenarioIds: collection.items.map((item) => item.scenarioId),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Koleksiyonlar alınamadı:", error);
    return NextResponse.json({ error: "Koleksiyonlar alınamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "POST:/api/admin/collections", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const body = await req.json();
    const { name, description, scenarioIds } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
    }

    const normalizedIds = normalizeScenarioIds(scenarioIds);
    if (normalizedIds === null) {
      return NextResponse.json({ error: "scenarioIds formatı geçersiz" }, { status: 400 });
    }
    const ids = normalizedIds ?? [];

    const collection = await prisma.scenarioCollection.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        items: {
          create: ids.map((scenarioId, index) => ({
            scenarioId,
            position: index,
          })),
        },
      },
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
      action: "COLLECTION_CREATE",
      entityType: "ScenarioCollection",
      entityId: collection.id,
      metadata: {
        name: collection.name,
        scenarioCount: collection.items.length,
      },
    });

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      scenarios: collection.items.map((item) => item.scenario),
      scenarioIds: collection.items.map((item) => item.scenarioId),
    });
  } catch (error) {
    console.error("Koleksiyon oluşturma hatası:", error);
    return NextResponse.json({ error: "Koleksiyon oluşturulamadı" }, { status: 500 });
  }
}
