import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";
import {
  parseModerationEntityType,
  parseModerationStatus,
  softDeleteModerationTarget,
} from "@/lib/admin/moderation";

function resolveDecision(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "APPROVE") {
    return "APPROVED";
  }
  if (normalized === "REJECT") {
    return "REJECTED";
  }

  const parsed = parseModerationStatus(normalized);
  if (parsed === "APPROVED" || parsed === "REJECTED") {
    return parsed;
  }

  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const limited = rateLimitResponse(
      session.user.id,
      "PATCH:/api/admin/moderation/reports/[id]",
      RATE_LIMIT_TIERS.ADMIN
    );
    if (limited) return limited;

    const { id } = await params;
    const body = await req.json();
    const decision = resolveDecision(body?.action ?? body?.status);
    const applySoftDelete = body?.applySoftDelete !== false;
    const resolutionNote = typeof body?.resolutionNote === "string"
      ? body.resolutionNote.trim()
      : "";

    if (!decision) {
      return NextResponse.json({ error: "Geçerli aksiyon gerekli (APPROVE/REJECT)" }, { status: 400 });
    }

    if (resolutionNote.length > 1500) {
      return NextResponse.json({ error: "Karar notu 1500 karakteri geçemez" }, { status: 400 });
    }

    const existingReport = await prisma.moderationReport.findUnique({
      where: { id },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        reason: true,
        status: true,
        reporterId: true,
      },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
    }

    if (existingReport.status !== "PENDING") {
      return NextResponse.json({ error: "Bu rapor zaten karara bağlanmış" }, { status: 409 });
    }

    const now = new Date();
    const softDeleteRequested = decision === "APPROVED" && applySoftDelete;
    const targetEntityType = parseModerationEntityType(existingReport.entityType);

    const updatedReport = await prisma.$transaction(async (tx) => {
      let softDeleteApplied = false;

      if (softDeleteRequested && targetEntityType) {
        softDeleteApplied = await softDeleteModerationTarget(
          tx,
          targetEntityType,
          existingReport.entityId,
          now
        );
      }

      const report = await tx.moderationReport.update({
        where: { id: existingReport.id },
        data: {
          status: decision,
          reviewedById: session.user.id,
          reviewedAt: now,
          resolutionNote: resolutionNote || null,
        },
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
      });

      return {
        report,
        softDeleteApplied,
      };
    });

    await logAdminAction({
      adminId: session.user.id,
      action: decision === "APPROVED" ? "MODERATION_REPORT_APPROVE" : "MODERATION_REPORT_REJECT",
      entityType: "ModerationReport",
      entityId: existingReport.id,
      metadata: {
        decision,
        reason: existingReport.reason,
        target: {
          entityType: existingReport.entityType,
          entityId: existingReport.entityId,
        },
        softDeleteRequested,
        softDeleteApplied: updatedReport.softDeleteApplied,
      },
    });

    return NextResponse.json({
      success: true,
      report: updatedReport.report,
      softDeleteApplied: updatedReport.softDeleteApplied,
    });
  } catch (error) {
    console.error("Moderation report güncellenemedi:", error);
    return NextResponse.json({ error: "Moderasyon aksiyonu başarısız" }, { status: 500 });
  }
}
