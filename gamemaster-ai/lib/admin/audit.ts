import { prisma } from "@/lib/db/prisma";

export type AdminAuditEntry = {
  adminId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAdminAction(entry: AdminAuditEntry) {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        entityType: entry.entityType || null,
        entityId: entry.entityId || null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Admin audit log write failed:", error);
  }
}
