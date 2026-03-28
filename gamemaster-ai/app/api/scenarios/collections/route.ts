import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, getClientIp, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// GET /api/scenarios/collections
// List all scenario collections (public)
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimitResponse(ip, "GET:/api/scenarios/collections", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const collections = await prisma.scenarioCollection.findMany({
      orderBy: { createdAt: "desc" },
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

    const formattedCollections = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      scenarios: collection.items
        .map((item) => item.scenario)
        .filter((scenario): scenario is NonNullable<typeof scenario> => scenario !== null),
    }));

    return NextResponse.json({ collections: formattedCollections });
  } catch (error) {
    console.error("Collections fetch error:", error);
    return NextResponse.json({ error: "Koleksiyonlar yüklenemedi" }, { status: 500 });
  }
}
