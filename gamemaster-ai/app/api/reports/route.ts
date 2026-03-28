import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import { findModerationTarget, parseModerationEntityType } from "@/lib/admin/moderation";

const REPORT_REASONS = new Set([
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "ILLEGAL_CONTENT",
  "MISINFORMATION",
  "OTHER",
]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const limited = rateLimitResponse(session.user.id, "POST:/api/reports", RATE_LIMIT_TIERS.WRITE);
    if (limited) return limited;

    const body = await req.json();
    const entityType = parseModerationEntityType(body?.entityType);
    const entityId = typeof body?.entityId === "string" ? body.entityId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim().toUpperCase() : "";
    const details = typeof body?.details === "string" ? body.details.trim() : "";

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Geçerli entityType ve entityId gerekli" }, { status: 400 });
    }

    if (!reason || !REPORT_REASONS.has(reason)) {
      return NextResponse.json({ error: "Geçerli bir rapor nedeni seçin" }, { status: 400 });
    }

    if (details.length > 1500) {
      return NextResponse.json({ error: "Rapor detayı 1500 karakteri geçemez" }, { status: 400 });
    }

    const reporter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isSoftDeleted: true,
        isSuspended: true,
        suspendedUntil: true,
      },
    });

    if (!reporter || reporter.isSoftDeleted) {
      return NextResponse.json({ error: "Hesabınız pasif olduğu için rapor gönderemezsiniz" }, { status: 403 });
    }

    if (reporter.isSuspended && (!reporter.suspendedUntil || reporter.suspendedUntil > new Date())) {
      return NextResponse.json({ error: "Hesabınız askıda olduğu için rapor gönderemezsiniz" }, { status: 403 });
    }

    const target = await findModerationTarget(prisma, entityType, entityId);
    if (!target) {
      return NextResponse.json({ error: "Raporlanan içerik bulunamadı" }, { status: 404 });
    }

    if (target.snapshot.isSoftDeleted) {
      return NextResponse.json({ error: "Bu içerik zaten pasif durumda" }, { status: 409 });
    }

    if (target.creatorId && target.creatorId === session.user.id) {
      return NextResponse.json({ error: "Kendi içeriğinizi raporlayamazsınız" }, { status: 400 });
    }

    const existingReport = await prisma.moderationReport.findFirst({
      where: {
        reporterId: session.user.id,
        entityType,
        entityId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existingReport) {
      return NextResponse.json({ error: "Bu içerik için zaten açık bir raporunuz var" }, { status: 409 });
    }

    const report = await prisma.moderationReport.create({
      data: {
        reporterId: session.user.id,
        entityType,
        entityId,
        reason,
        details: details || null,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("Rapor oluşturulamadı:", error);
    return NextResponse.json({ error: "Rapor gönderilemedi" }, { status: 500 });
  }
}
