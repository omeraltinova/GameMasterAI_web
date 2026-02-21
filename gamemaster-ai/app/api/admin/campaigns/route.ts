import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const limited = rateLimitResponse(session.user.id, "GET:/api/admin/campaigns", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { creator: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          creator: { select: { username: true, email: true } },
          _count: { select: { players: true, sessions: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Oturumlar alınamadı" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const limited = rateLimitResponse(session.user.id, "DELETE:/api/admin/campaigns", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id } });

    await logAdminAction({
      adminId: session.user.id,
      action: "CAMPAIGN_DELETE",
      entityType: "Campaign",
      entityId: id,
      metadata: {
        name: campaign.name,
        status: campaign.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
