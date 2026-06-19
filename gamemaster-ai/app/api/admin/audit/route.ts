import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = await rateLimitResponse(session.user.id, "GET:/api/admin/audit", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "25");
    const offsetParam = parseInt(searchParams.get("offset") || "0");
    const limit = Math.min(Math.max(limitParam, 1), 100);
    const offset = Math.max(offsetParam, 0);

    const logs = await prisma.adminActionLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const normalized = logs.map((log) => {
      let metadata: Record<string, unknown> | null = null;
      if (log.metadata) {
        try {
          metadata = JSON.parse(log.metadata);
        } catch {
          metadata = null;
        }
      }

      return { ...log, metadata };
    });

    return NextResponse.json({ data: normalized });
  } catch (error) {
    console.error("Admin audit log alınamadı:", error);
    return NextResponse.json({ error: "Denetim kayıtları alınamadı" }, { status: 500 });
  }
}
