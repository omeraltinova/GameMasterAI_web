import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, getClientIp, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// GET /api/scenarios/collections/[id]
// Get a single scenario collection with its scenarios
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip, "GET:/api/scenarios/collections/[id]", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const { id } = await params;

    const collection = await prisma.scenarioCollection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            scenario: {
              select: {
                id: true,
                title: true,
                description: true,
                genre: true,
                difficulty: true,
                isOfficial: true,
                isFeatured: true,
                isAIGenerated: true,
                creator: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı" }, { status: 404 });
    }

    const scenarios = collection.items
      .map((item) => item.scenario)
      .filter((scenario): scenario is NonNullable<typeof scenario> => scenario !== null);

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
        scenarios,
      },
    });
  } catch (error) {
    console.error("Collection fetch error:", error);
    return NextResponse.json({ error: "Koleksiyon yüklenemedi" }, { status: 500 });
  }
}
