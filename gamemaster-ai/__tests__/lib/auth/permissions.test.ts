import { describe, it, expect } from 'vitest';
import {
  canManageCampaign,
  getCampaignActorRole,
  hasCampaignAccess,
} from '@/lib/auth/permissions';

describe('campaign permissions', () => {
  const campaign = {
    creatorId: 'gm-1',
    players: [
      { userId: 'p-1' },
      { userId: 'p-2' },
    ],
  };

  it('returns GM for creator', () => {
    const role = getCampaignActorRole(campaign, 'gm-1');
    expect(role).toBe('GM');
    expect(canManageCampaign(role)).toBe(true);
    expect(hasCampaignAccess(role)).toBe(true);
  });

  it('returns PLAYER for campaign player', () => {
    const role = getCampaignActorRole(campaign, 'p-2');
    expect(role).toBe('PLAYER');
    expect(canManageCampaign(role)).toBe(false);
    expect(hasCampaignAccess(role)).toBe(true);
  });

  it('returns NONE for unrelated user', () => {
    const role = getCampaignActorRole(campaign, 'outsider');
    expect(role).toBe('NONE');
    expect(canManageCampaign(role)).toBe(false);
    expect(hasCampaignAccess(role)).toBe(false);
  });
});
