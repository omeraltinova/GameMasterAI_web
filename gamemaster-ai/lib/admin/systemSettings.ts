import { prisma } from "@/lib/db/prisma";

export const SYSTEM_SETTINGS_ID = "singleton";

export type SystemSettingsInput = {
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  aiPrimaryModel?: string | null;
  aiFallbackModel?: string | null;
  aiRequestsPerMinute?: number | null;
  updatedById?: string | null;
};

export function normalizeSystemSettingsInput(input: SystemSettingsInput) {
  const normalizedRequestsPerMinute =
    typeof input.aiRequestsPerMinute === "number"
      ? Math.max(0, Math.floor(input.aiRequestsPerMinute))
      : null;

  return {
    maintenanceMode: Boolean(input.maintenanceMode),
    maintenanceMessage: input.maintenanceMessage?.trim() || null,
    aiPrimaryModel: input.aiPrimaryModel?.trim() || null,
    aiFallbackModel: input.aiFallbackModel?.trim() || null,
    aiRequestsPerMinute: normalizedRequestsPerMinute,
    updatedById: input.updatedById || null,
  };
}

export async function getSystemSettings() {
  return prisma.systemSetting.findUnique({
    where: { id: SYSTEM_SETTINGS_ID },
  });
}

export async function upsertSystemSettings(input: SystemSettingsInput) {
  const data = normalizeSystemSettingsInput(input);

  return prisma.systemSetting.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    update: data,
    create: {
      id: SYSTEM_SETTINGS_ID,
      ...data,
    },
  });
}
