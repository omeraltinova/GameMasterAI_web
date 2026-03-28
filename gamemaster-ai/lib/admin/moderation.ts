import type { Prisma, PrismaClient } from "@prisma/client";

export const MODERATION_ENTITY_TYPES = ["SCENARIO", "CAMPAIGN", "MESSAGE"] as const;
export const MODERATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type ModerationEntityType = (typeof MODERATION_ENTITY_TYPES)[number];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export interface ModerationEntitySnapshot {
  entityType: ModerationEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  preview: string;
  isSoftDeleted: boolean;
}

const moderationEntityTypeSet = new Set<string>(MODERATION_ENTITY_TYPES);
const moderationStatusSet = new Set<string>(MODERATION_STATUSES);

function previewText(value: string | null | undefined, maxLength = 180) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function parseModerationEntityType(value: unknown): ModerationEntityType | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!moderationEntityTypeSet.has(normalized)) {
    return null;
  }
  return normalized as ModerationEntityType;
}

export function parseModerationStatus(value: unknown): ModerationStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!moderationStatusSet.has(normalized)) {
    return null;
  }
  return normalized as ModerationStatus;
}

export async function findModerationTarget(prisma: PrismaClient, entityType: ModerationEntityType, entityId: string) {
  if (entityType === "SCENARIO") {
    const target = await prisma.scenario.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        title: true,
        description: true,
        creatorId: true,
        isSoftDeleted: true,
      },
    });

    if (!target) {
      return null;
    }

    return {
      exists: true,
      creatorId: target.creatorId,
      snapshot: {
        entityType,
        entityId: target.id,
        title: target.title,
        subtitle: "Senaryo",
        preview: previewText(target.description),
        isSoftDeleted: target.isSoftDeleted,
      } satisfies ModerationEntitySnapshot,
    };
  }

  if (entityType === "CAMPAIGN") {
    const target = await prisma.campaign.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        name: true,
        description: true,
        creatorId: true,
        status: true,
        isSoftDeleted: true,
      },
    });

    if (!target) {
      return null;
    }

    return {
      exists: true,
      creatorId: target.creatorId,
      snapshot: {
        entityType,
        entityId: target.id,
        title: target.name,
        subtitle: `Kampanya • ${target.status}`,
        preview: previewText(target.description),
        isSoftDeleted: target.isSoftDeleted,
      } satisfies ModerationEntitySnapshot,
    };
  }

  const target = await prisma.message.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      content: true,
      senderId: true,
      senderName: true,
      senderType: true,
      isSoftDeleted: true,
    },
  });

  if (!target) {
    return null;
  }

  return {
    exists: true,
    creatorId: target.senderId,
    snapshot: {
      entityType,
      entityId: target.id,
      title: target.senderName || "Mesaj",
      subtitle: `Mesaj • ${target.senderType}`,
      preview: previewText(target.content),
      isSoftDeleted: target.isSoftDeleted,
    } satisfies ModerationEntitySnapshot,
  };
}

export async function buildModerationSnapshots(
  prisma: PrismaClient,
  reports: Array<{ entityType: string; entityId: string }>
) {
  const scenarioIds = reports
    .filter((report) => report.entityType === "SCENARIO")
    .map((report) => report.entityId);
  const campaignIds = reports
    .filter((report) => report.entityType === "CAMPAIGN")
    .map((report) => report.entityId);
  const messageIds = reports
    .filter((report) => report.entityType === "MESSAGE")
    .map((report) => report.entityId);

  const [scenarios, campaigns, messages] = await Promise.all([
    scenarioIds.length
      ? prisma.scenario.findMany({
          where: { id: { in: scenarioIds } },
          select: { id: true, title: true, description: true, isSoftDeleted: true },
        })
      : Promise.resolve([]),
    campaignIds.length
      ? prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, name: true, description: true, status: true, isSoftDeleted: true },
        })
      : Promise.resolve([]),
    messageIds.length
      ? prisma.message.findMany({
          where: { id: { in: messageIds } },
          select: {
            id: true,
            content: true,
            senderName: true,
            senderType: true,
            isSoftDeleted: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const snapshots = new Map<string, ModerationEntitySnapshot>();

  for (const item of scenarios) {
    snapshots.set(`SCENARIO:${item.id}`, {
      entityType: "SCENARIO",
      entityId: item.id,
      title: item.title,
      subtitle: "Senaryo",
      preview: previewText(item.description),
      isSoftDeleted: item.isSoftDeleted,
    });
  }

  for (const item of campaigns) {
    snapshots.set(`CAMPAIGN:${item.id}`, {
      entityType: "CAMPAIGN",
      entityId: item.id,
      title: item.name,
      subtitle: `Kampanya • ${item.status}`,
      preview: previewText(item.description),
      isSoftDeleted: item.isSoftDeleted,
    });
  }

  for (const item of messages) {
    snapshots.set(`MESSAGE:${item.id}`, {
      entityType: "MESSAGE",
      entityId: item.id,
      title: item.senderName || "Mesaj",
      subtitle: `Mesaj • ${item.senderType}`,
      preview: previewText(item.content),
      isSoftDeleted: item.isSoftDeleted,
    });
  }

  return snapshots;
}

export async function softDeleteModerationTarget(
  tx: Prisma.TransactionClient,
  entityType: ModerationEntityType,
  entityId: string,
  now = new Date()
) {
  if (entityType === "SCENARIO") {
    const result = await tx.scenario.updateMany({
      where: { id: entityId, isSoftDeleted: false },
      data: { isSoftDeleted: true, softDeletedAt: now },
    });
    return result.count > 0;
  }

  if (entityType === "CAMPAIGN") {
    const result = await tx.campaign.updateMany({
      where: { id: entityId, isSoftDeleted: false },
      data: { isSoftDeleted: true, softDeletedAt: now, status: "PAUSED" },
    });
    return result.count > 0;
  }

  const result = await tx.message.updateMany({
    where: { id: entityId, isSoftDeleted: false },
    data: { isSoftDeleted: true, softDeletedAt: now },
  });
  return result.count > 0;
}
