export type CampaignActorRole = "GM" | "PLAYER" | "NONE";

type CampaignMembership = {
  creatorId: string;
  players?: Array<{ userId: string }>;
};

export function getCampaignActorRole(
  campaign: CampaignMembership,
  userId: string,
): CampaignActorRole {
  if (campaign.creatorId === userId) {
    return "GM";
  }

  if (campaign.players?.some((player) => player.userId === userId)) {
    return "PLAYER";
  }

  return "NONE";
}

export function hasCampaignAccess(role: CampaignActorRole) {
  return role !== "NONE";
}

export function canManageCampaign(role: CampaignActorRole) {
  return role === "GM";
}

