import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { Prisma } from "@prisma/client";

const VALID_ROLES = new Set(["ADMIN", "MEMBER"]);

const USER_ACTIONS = {
  SET_SUSPENSION: "SET_SUSPENSION",
  SET_ADMIN_NOTE: "SET_ADMIN_NOTE",
  SOFT_DELETE: "SOFT_DELETE",
  RESTORE_SOFT_DELETE: "RESTORE_SOFT_DELETE",
} as const;

type UserAction = (typeof USER_ACTIONS)[keyof typeof USER_ACTIONS];

const USER_MUTATION_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isSuspended: true,
  suspendedUntil: true,
  suspensionReason: true,
  adminNote: true,
  isSoftDeleted: true,
  softDeletedAt: true,
  softDeleteReason: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function parseDateInput(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

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
    const includeSoftDeleted = searchParams.get("includeSoftDeleted") !== "false";

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (!includeSoftDeleted) {
      where.isSoftDeleted = false;
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
          isSuspended: true,
          suspendedUntil: true,
          suspensionReason: true,
          adminNote: true,
          isSoftDeleted: true,
          softDeletedAt: true,
          softDeleteReason: true,
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

    const body = await req.json();
    const { userId, role, action } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isSuspended: true,
        suspendedUntil: true,
        suspensionReason: true,
        adminNote: true,
        isSoftDeleted: true,
        softDeletedAt: true,
        softDeleteReason: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Geriye dönük uyumluluk: role verilirse rol güncellemesi yapılır.
    if (typeof role === "string") {
      if (!VALID_ROLES.has(role)) {
        return NextResponse.json({ error: "Geçersiz rol değeri" }, { status: 400 });
      }

      if (userId === session.user.id && role !== "ADMIN") {
        return NextResponse.json({ error: "Kendi yetkinizi alamazsınız." }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: USER_MUTATION_SELECT,
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
    }

    const typedAction = action as UserAction;
    if (!typedAction || !Object.values(USER_ACTIONS).includes(typedAction)) {
      return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
    }

    if (typedAction === USER_ACTIONS.SET_SUSPENSION) {
      const isSuspended = Boolean(body.isSuspended);
      const suspendedUntil = parseDateInput(body.suspendedUntil);
      const suspensionReason = typeof body.suspensionReason === "string"
        ? body.suspensionReason.trim()
        : "";

      if (userId === session.user.id && isSuspended) {
        return NextResponse.json({ error: "Kendinizi askıya alamazsınız." }, { status: 400 });
      }

      if (body.suspendedUntil && !suspendedUntil) {
        return NextResponse.json({ error: "suspendedUntil geçersiz tarih formatında" }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended,
          suspendedUntil: isSuspended ? suspendedUntil : null,
          suspensionReason: isSuspended ? (suspensionReason || null) : null,
        },
        select: USER_MUTATION_SELECT,
      });

      await logAdminAction({
        adminId: session.user.id,
        action: "USER_SUSPENSION_UPDATE",
        entityType: "User",
        entityId: userId,
        metadata: {
          username: existingUser.username,
          from: {
            isSuspended: existingUser.isSuspended,
            suspendedUntil: existingUser.suspendedUntil,
            suspensionReason: existingUser.suspensionReason,
          },
          to: {
            isSuspended,
            suspendedUntil: isSuspended ? suspendedUntil : null,
            suspensionReason: isSuspended ? (suspensionReason || null) : null,
          },
        },
      });

      return NextResponse.json(updatedUser);
    }

    if (typedAction === USER_ACTIONS.SET_ADMIN_NOTE) {
      const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
      if (adminNote.length > 2000) {
        return NextResponse.json({ error: "Admin notu 2000 karakteri geçemez" }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { adminNote: adminNote || null },
        select: USER_MUTATION_SELECT,
      });

      await logAdminAction({
        adminId: session.user.id,
        action: "USER_ADMIN_NOTE_UPDATE",
        entityType: "User",
        entityId: userId,
        metadata: {
          username: existingUser.username,
          hadNoteBefore: Boolean(existingUser.adminNote),
          hasNoteAfter: Boolean(adminNote),
        },
      });

      return NextResponse.json(updatedUser);
    }

    if (typedAction === USER_ACTIONS.SOFT_DELETE) {
      if (userId === session.user.id) {
        return NextResponse.json({ error: "Kendinizi pasifleştiremezsiniz." }, { status: 400 });
      }
      if (existingUser.role === "ADMIN") {
        return NextResponse.json({ error: "Başka bir admin pasifleştirilemez." }, { status: 403 });
      }

      const reason = typeof body.softDeleteReason === "string"
        ? body.softDeleteReason.trim()
        : "";
      const now = new Date();

      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            isSoftDeleted: true,
            softDeletedAt: now,
            softDeleteReason: reason || null,
            isSuspended: true,
            suspendedUntil: null,
            suspensionReason: reason || "Hesap admin tarafından pasifleştirildi",
          },
          select: USER_MUTATION_SELECT,
        });

        await Promise.all([
          tx.scenario.updateMany({
            where: { creatorId: userId, isSoftDeleted: false },
            data: { isSoftDeleted: true, softDeletedAt: now },
          }),
          tx.campaign.updateMany({
            where: { creatorId: userId, isSoftDeleted: false },
            data: { isSoftDeleted: true, softDeletedAt: now, status: "PAUSED" },
          }),
          tx.message.updateMany({
            where: { senderId: userId, isSoftDeleted: false },
            data: { isSoftDeleted: true, softDeletedAt: now },
          }),
        ]);

        return user;
      });

      await logAdminAction({
        adminId: session.user.id,
        action: "USER_SOFT_DELETE",
        entityType: "User",
        entityId: userId,
        metadata: {
          username: existingUser.username,
          reason: reason || null,
        },
      });

      return NextResponse.json(updatedUser);
    }

    if (typedAction === USER_ACTIONS.RESTORE_SOFT_DELETE) {
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            isSoftDeleted: false,
            softDeletedAt: null,
            softDeleteReason: null,
            isSuspended: false,
            suspendedUntil: null,
            suspensionReason: null,
          },
          select: USER_MUTATION_SELECT,
        });

        await Promise.all([
          tx.scenario.updateMany({
            where: { creatorId: userId, isSoftDeleted: true },
            data: { isSoftDeleted: false, softDeletedAt: null },
          }),
          tx.campaign.updateMany({
            where: { creatorId: userId, isSoftDeleted: true },
            data: { isSoftDeleted: false, softDeletedAt: null },
          }),
          tx.message.updateMany({
            where: { senderId: userId, isSoftDeleted: true },
            data: { isSoftDeleted: false, softDeletedAt: null },
          }),
        ]);

        return user;
      });

      await logAdminAction({
        adminId: session.user.id,
        action: "USER_SOFT_DELETE_RESTORE",
        entityType: "User",
        entityId: userId,
        metadata: {
          username: existingUser.username,
        },
      });

      return NextResponse.json(updatedUser);
    }

    return NextResponse.json({ error: "Desteklenmeyen aksiyon" }, { status: 400 });
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
    const hardDelete = searchParams.get("hard") === "true";

    if (!userId) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    }

    if (!hardDelete) {
      return NextResponse.json(
        { error: "Kalıcı silme devre dışı. Kullanıcıyı pasifleştirmek için PATCH SOFT_DELETE aksiyonunu kullanın." },
        { status: 400 }
      );
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
