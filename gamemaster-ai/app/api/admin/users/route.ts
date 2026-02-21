import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

// KULLANICILARI LİSTELE
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(session.user.id, "GET:/api/admin/users", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { characters: true, campaigns: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Kullanıcılar alınamadı" }, { status: 500 });
  }
}

// ROL GÜNCELLE (PATCH)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(session.user.id, "PATCH:/api/admin/users", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { userId, role } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    const VALID_ROLES = ["ADMIN", "MEMBER"] as const;
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol değeri" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Kendini adminlikten çıkarmayı engelle
    if (userId === session.user.id && role !== "ADMIN") {
      return NextResponse.json({ error: "Kendi yetkinizi alamazsınız." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "USER_ROLE_UPDATE",
      entityType: "User",
      entityId: userId,
      metadata: {
        username: existingUser.username,
        fromRole: existingUser.role,
        toRole: role,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

// KULLANICI SİL (DELETE)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(session.user.id, "DELETE:/api/admin/users", RATE_LIMIT_TIERS.ADMIN);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "Kendinizi silemezsiniz." }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (userToDelete.role === "ADMIN") {
      return NextResponse.json({ error: "Başka bir admin silinemez." }, { status: 403 });
    }

    // İlişkileri temizle (Transaction)
    await prisma.$transaction(async (tx) => {
      await tx.message.updateMany({ where: { senderId: userId }, data: { senderId: null, senderName: "Silinmiş Kullanıcı" } });
      await tx.scenario.updateMany({ where: { creatorId: userId }, data: { creatorId: null } });
      await tx.user.delete({ where: { id: userId } });
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "USER_DELETE",
      entityType: "User",
      entityId: userId,
      metadata: {
        username: userToDelete.username,
        email: userToDelete.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Silme işlemi başarısız" }, { status: 500 });
  }
}
