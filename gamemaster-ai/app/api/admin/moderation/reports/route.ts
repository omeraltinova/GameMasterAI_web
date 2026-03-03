import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import {
  buildModerationSnapshots,
  parseModerationEntityType,
  parseModerationStatus,
} from "@/lib/admin/moderation";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(
      session.user.id,
      "GET:/api/admin/moderation/reports",
      RATE_LIMIT_TIERS.ADMIN
    );
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const statusInput = searchParams.get("status")?.trim().toUpperCase() || "PENDING";
    const entityTypeInput = searchParams.get("entityType")?.trim().toUpperCase() || "";
    const search = searchParams.get("search")?.trim() || "";

    const where: Prisma.ModerationReportWhereInput = {};

    if (statusInput && statusInput !== "ALL") {
      const status = parseModerationStatus(statusInput);
      if (!status) {
        return NextResponse.json({ error: "Geçersiz status değeri" }, { status: 400 });
      }
      where.status = status;
    }

    if (entityTypeInput && entityTypeInput !== "ALL") {
      const entityType = parseModerationEntityType(entityTypeInput);
      if (!entityType) {
        return NextResponse.json({ error: "Geçersiz entityType değeri" }, { status: 400 });
      }
      where.entityType = entityType;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { reporter: { is: { username: { contains: search, mode: "insensitive" } } } },
        { reporter: { is: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [reports, total, pending, approved, rejected] = await Promise.all([
      prisma.moderationReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.moderationReport.count({ where }),
      prisma.moderationReport.count({ where: { status: "PENDING" } }),
      prisma.moderationReport.count({ where: { status: "APPROVED" } }),
      prisma.moderationReport.count({ where: { status: "REJECTED" } }),
    ]);

    const snapshots = await buildModerationSnapshots(prisma, reports);

    return NextResponse.json({
      reports: reports.map((report) => ({
        ...report,
        entity: snapshots.get(`${report.entityType}:${report.entityId}`) || null,
      })),
      stats: {
        pending,
        approved,
        rejected,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Moderation reports getirilemedi:", error);
    return NextResponse.json({ error: "Moderasyon raporları alınamadı" }, { status: 500 });
  }
}
