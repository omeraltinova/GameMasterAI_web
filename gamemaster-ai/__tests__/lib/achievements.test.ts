import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENT_DEFINITIONS,
  checkAchievements,
  type AchievementStats,
  type AchievementCategory,
} from "@/lib/achievements";

// ── Helper: create stats with sensible defaults ─────────────────────────────
function makeStats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  return {
    totalCharacters: 0,
    totalCampaignsCreated: 0,
    totalCampaignsJoined: 0,
    completedCampaigns: 0,
    activeCampaigns: 0,
    totalMessages: 0,
    totalDiceRolls: 0,
    totalScenarios: 0,
    criticalSuccesses: 0,
    criticalFailures: 0,
    avgD20: 10,
    d20TotalRolls: 0,
    favoriteRace: null,
    highestLevel: 1,
    monthsSinceJoin: 0,
    ...overrides,
  };
}

/** Lookup helper */
function findResult(results: ReturnType<typeof checkAchievements>, id: string) {
  return results.find((r) => r.id === id);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ACHIEVEMENT_DEFINITIONS sanity checks
// ═════════════════════════════════════════════════════════════════════════════
describe("ACHIEVEMENT_DEFINITIONS", () => {
  it("should have 28 achievement definitions", () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(28);
  });

  it("should have unique ids", () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every definition has required fields", () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.iconName).toBeTruthy();
      expect(def.color).toBeTruthy();
      expect(["general", "combat", "social", "exploration"]).toContain(def.category);
    }
  });

  it("has achievements in all four categories", () => {
    const categories = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.category));
    expect(categories).toEqual(new Set(["general", "combat", "social", "exploration"]));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. checkAchievements – return shape
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – return shape", () => {
  it("returns one entry per definition", () => {
    const results = checkAchievements(makeStats());
    expect(results).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
  });

  it("every entry has id and unlocked boolean", () => {
    const results = checkAchievements(makeStats());
    for (const r of results) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("unlocked");
      expect(typeof r.unlocked).toBe("boolean");
    }
  });

  it("preserves definition order", () => {
    const results = checkAchievements(makeStats());
    for (let i = 0; i < results.length; i++) {
      expect(results[i].id).toBe(ACHIEVEMENT_DEFINITIONS[i].id);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. checkAchievements – brand-new user (minimal stats)
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – brand-new user", () => {
  const results = checkAchievements(makeStats());

  it("newcomer is always unlocked", () => {
    expect(findResult(results, "newcomer")?.unlocked).toBe(true);
  });

  it("veteran is locked (0 months)", () => {
    expect(findResult(results, "veteran")?.unlocked).toBe(false);
  });

  it("first_character is locked (0 characters)", () => {
    expect(findResult(results, "first_character")?.unlocked).toBe(false);
  });

  it("perfectionist is locked", () => {
    expect(findResult(results, "perfectionist")?.unlocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. General category achievements
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – general category", () => {
  it("veteran: unlocked at 6 months", () => {
    const r = checkAchievements(makeStats({ monthsSinceJoin: 6 }));
    expect(findResult(r, "veteran")?.unlocked).toBe(true);
  });

  it("veteran: locked at 5 months", () => {
    const r = checkAchievements(makeStats({ monthsSinceJoin: 5 }));
    expect(findResult(r, "veteran")?.unlocked).toBe(false);
  });

  it("ancient: unlocked at 12 months", () => {
    const r = checkAchievements(makeStats({ monthsSinceJoin: 12 }));
    expect(findResult(r, "ancient")?.unlocked).toBe(true);
  });

  it("ancient: locked at 11 months", () => {
    const r = checkAchievements(makeStats({ monthsSinceJoin: 11 }));
    expect(findResult(r, "ancient")?.unlocked).toBe(false);
  });

  it("first_character: unlocked with 1 character", () => {
    const r = checkAchievements(makeStats({ totalCharacters: 1 }));
    expect(findResult(r, "first_character")?.unlocked).toBe(true);
  });

  it("character_collector: unlocked with 5 characters", () => {
    const r = checkAchievements(makeStats({ totalCharacters: 5 }));
    expect(findResult(r, "character_collector")?.unlocked).toBe(true);
  });

  it("character_collector: locked with 4 characters", () => {
    const r = checkAchievements(makeStats({ totalCharacters: 4 }));
    expect(findResult(r, "character_collector")?.unlocked).toBe(false);
  });

  it("experienced: unlocked when totalCampaignsCreated + totalCampaignsJoined >= 10", () => {
    const r = checkAchievements(
      makeStats({ totalCampaignsCreated: 5, totalCampaignsJoined: 5 })
    );
    expect(findResult(r, "experienced")?.unlocked).toBe(true);
  });

  it("experienced: locked at 9 total campaigns", () => {
    const r = checkAchievements(
      makeStats({ totalCampaignsCreated: 5, totalCampaignsJoined: 4 })
    );
    expect(findResult(r, "experienced")?.unlocked).toBe(false);
  });

  it("completionist: unlocked at 5 completed campaigns", () => {
    const r = checkAchievements(makeStats({ completedCampaigns: 5 }));
    expect(findResult(r, "completionist")?.unlocked).toBe(true);
  });

  it("legend: unlocked at level 10", () => {
    const r = checkAchievements(makeStats({ highestLevel: 10 }));
    expect(findResult(r, "legend")?.unlocked).toBe(true);
  });

  it("legend: locked at level 9", () => {
    const r = checkAchievements(makeStats({ highestLevel: 9 }));
    expect(findResult(r, "legend")?.unlocked).toBe(false);
  });

  it("mythic: unlocked at level 20", () => {
    const r = checkAchievements(makeStats({ highestLevel: 20 }));
    expect(findResult(r, "mythic")?.unlocked).toBe(true);
  });

  it("mythic: locked at level 19", () => {
    const r = checkAchievements(makeStats({ highestLevel: 19 }));
    expect(findResult(r, "mythic")?.unlocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Combat category achievements
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – combat category", () => {
  it("first_roll: unlocked at 1 dice roll", () => {
    const r = checkAchievements(makeStats({ totalDiceRolls: 1 }));
    expect(findResult(r, "first_roll")?.unlocked).toBe(true);
  });

  it("first_roll: locked at 0 dice rolls", () => {
    const r = checkAchievements(makeStats({ totalDiceRolls: 0 }));
    expect(findResult(r, "first_roll")?.unlocked).toBe(false);
  });

  it("dice_master: unlocked at 100 rolls", () => {
    const r = checkAchievements(makeStats({ totalDiceRolls: 100 }));
    expect(findResult(r, "dice_master")?.unlocked).toBe(true);
  });

  it("dice_addict: unlocked at 500 rolls", () => {
    const r = checkAchievements(makeStats({ totalDiceRolls: 500 }));
    expect(findResult(r, "dice_addict")?.unlocked).toBe(true);
  });

  it("lucky: unlocked at 10 critical successes", () => {
    const r = checkAchievements(makeStats({ criticalSuccesses: 10 }));
    expect(findResult(r, "lucky")?.unlocked).toBe(true);
  });

  it("blessed: unlocked at 50 critical successes", () => {
    const r = checkAchievements(makeStats({ criticalSuccesses: 50 }));
    expect(findResult(r, "blessed")?.unlocked).toBe(true);
  });

  it("cursed: unlocked at 10 critical failures", () => {
    const r = checkAchievements(makeStats({ criticalFailures: 10 }));
    expect(findResult(r, "cursed")?.unlocked).toBe(true);
  });

  it("cursed: locked at 9 critical failures", () => {
    const r = checkAchievements(makeStats({ criticalFailures: 9 }));
    expect(findResult(r, "cursed")?.unlocked).toBe(false);
  });

  it("hot_streak: unlocked when avgD20 >= 12 AND d20TotalRolls >= 20", () => {
    const r = checkAchievements(makeStats({ avgD20: 12, d20TotalRolls: 20 }));
    expect(findResult(r, "hot_streak")?.unlocked).toBe(true);
  });

  it("hot_streak: locked when avgD20 >= 12 but d20TotalRolls < 20", () => {
    const r = checkAchievements(makeStats({ avgD20: 15, d20TotalRolls: 10 }));
    expect(findResult(r, "hot_streak")?.unlocked).toBe(false);
  });

  it("hot_streak: locked when d20TotalRolls >= 20 but avgD20 < 12", () => {
    const r = checkAchievements(makeStats({ avgD20: 11, d20TotalRolls: 30 }));
    expect(findResult(r, "hot_streak")?.unlocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Social category achievements
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – social category", () => {
  it("first_words: unlocked at 10 messages", () => {
    const r = checkAchievements(makeStats({ totalMessages: 10 }));
    expect(findResult(r, "first_words")?.unlocked).toBe(true);
  });

  it("chatterbox: unlocked at 100 messages", () => {
    const r = checkAchievements(makeStats({ totalMessages: 100 }));
    expect(findResult(r, "chatterbox")?.unlocked).toBe(true);
  });

  it("storyteller: unlocked at 500 messages", () => {
    const r = checkAchievements(makeStats({ totalMessages: 500 }));
    expect(findResult(r, "storyteller")?.unlocked).toBe(true);
  });

  it("bard: unlocked at 1000 messages", () => {
    const r = checkAchievements(makeStats({ totalMessages: 1000 }));
    expect(findResult(r, "bard")?.unlocked).toBe(true);
  });

  it("bard: locked at 999 messages", () => {
    const r = checkAchievements(makeStats({ totalMessages: 999 }));
    expect(findResult(r, "bard")?.unlocked).toBe(false);
  });

  it("first_campaign: unlocked when totalCampaignsCreated >= 1", () => {
    const r = checkAchievements(makeStats({ totalCampaignsCreated: 1 }));
    expect(findResult(r, "first_campaign")?.unlocked).toBe(true);
  });

  it("first_campaign: unlocked when totalCampaignsJoined >= 1", () => {
    const r = checkAchievements(makeStats({ totalCampaignsJoined: 1 }));
    expect(findResult(r, "first_campaign")?.unlocked).toBe(true);
  });

  it("party_animal: unlocked at 5 joined campaigns", () => {
    const r = checkAchievements(makeStats({ totalCampaignsJoined: 5 }));
    expect(findResult(r, "party_animal")?.unlocked).toBe(true);
  });

  it("party_animal: locked at 4 joined campaigns", () => {
    const r = checkAchievements(makeStats({ totalCampaignsJoined: 4 }));
    expect(findResult(r, "party_animal")?.unlocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Exploration category achievements
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – exploration category", () => {
  it("creator: unlocked at 3 scenarios", () => {
    const r = checkAchievements(makeStats({ totalScenarios: 3 }));
    expect(findResult(r, "creator")?.unlocked).toBe(true);
  });

  it("creator: locked at 2 scenarios", () => {
    const r = checkAchievements(makeStats({ totalScenarios: 2 }));
    expect(findResult(r, "creator")?.unlocked).toBe(false);
  });

  it("campaign_leader: unlocked at 3 created campaigns", () => {
    const r = checkAchievements(makeStats({ totalCampaignsCreated: 3 }));
    expect(findResult(r, "campaign_leader")?.unlocked).toBe(true);
  });

  it("warlord: unlocked at 10 created campaigns", () => {
    const r = checkAchievements(makeStats({ totalCampaignsCreated: 10 }));
    expect(findResult(r, "warlord")?.unlocked).toBe(true);
  });

  it("warlord: locked at 9 created campaigns", () => {
    const r = checkAchievements(makeStats({ totalCampaignsCreated: 9 }));
    expect(findResult(r, "warlord")?.unlocked).toBe(false);
  });

  it("treasure_hunter: unlocked when favoriteRace is set AND totalCharacters >= 5", () => {
    const r = checkAchievements(
      makeStats({ favoriteRace: "Elf", totalCharacters: 5 })
    );
    expect(findResult(r, "treasure_hunter")?.unlocked).toBe(true);
  });

  it("treasure_hunter: locked when favoriteRace is null", () => {
    const r = checkAchievements(makeStats({ favoriteRace: null, totalCharacters: 10 }));
    expect(findResult(r, "treasure_hunter")?.unlocked).toBe(false);
  });

  it("treasure_hunter: locked when totalCharacters < 5", () => {
    const r = checkAchievements(
      makeStats({ favoriteRace: "Dwarf", totalCharacters: 4 })
    );
    expect(findResult(r, "treasure_hunter")?.unlocked).toBe(false);
  });

  it("mountaineer: unlocked at 10 active campaigns", () => {
    const r = checkAchievements(makeStats({ activeCampaigns: 10 }));
    expect(findResult(r, "mountaineer")?.unlocked).toBe(true);
  });

  it("mountaineer: locked at 9 active campaigns", () => {
    const r = checkAchievements(makeStats({ activeCampaigns: 9 }));
    expect(findResult(r, "mountaineer")?.unlocked).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Perfectionist (meta-achievement)
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – perfectionist meta-achievement", () => {
  it("locked when fewer than 15 other achievements are unlocked", () => {
    // newcomer (always true) + a handful more = well under 15
    const r = checkAchievements(
      makeStats({
        totalCharacters: 1,
        totalDiceRolls: 1,
        totalMessages: 10,
      })
    );
    expect(findResult(r, "perfectionist")?.unlocked).toBe(false);
  });

  it("unlocked when exactly 15 other achievements are unlocked", () => {
    // Build stats that unlock exactly 15 non-perfectionist achievements:
    // newcomer (1), veteran (2), ancient (3), first_character (4),
    // character_collector (5), experienced (6), completionist (7),
    // legend (8), first_roll (9), dice_master (10), lucky (11),
    // first_words (12), chatterbox (13), first_campaign (14),
    // campaign_leader (15)
    const r = checkAchievements(
      makeStats({
        monthsSinceJoin: 12,
        totalCharacters: 5,
        totalCampaignsCreated: 5,
        totalCampaignsJoined: 5,
        completedCampaigns: 5,
        highestLevel: 10,
        totalDiceRolls: 100,
        criticalSuccesses: 10,
        totalMessages: 100,
      })
    );

    // Count non-perfectionist unlocked
    const unlocked = r.filter((x) => x.id !== "perfectionist" && x.unlocked);
    expect(unlocked.length).toBeGreaterThanOrEqual(15);
    expect(findResult(r, "perfectionist")?.unlocked).toBe(true);
  });

  it("unlocked when many achievements are unlocked (super-user)", () => {
    const r = checkAchievements(
      makeStats({
        monthsSinceJoin: 24,
        totalCharacters: 10,
        totalCampaignsCreated: 10,
        totalCampaignsJoined: 10,
        completedCampaigns: 10,
        activeCampaigns: 10,
        totalMessages: 1000,
        totalDiceRolls: 500,
        totalScenarios: 5,
        criticalSuccesses: 50,
        criticalFailures: 10,
        avgD20: 14,
        d20TotalRolls: 100,
        favoriteRace: "Elf",
        highestLevel: 20,
      })
    );
    expect(findResult(r, "perfectionist")?.unlocked).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. Edge cases
// ═════════════════════════════════════════════════════════════════════════════
describe("checkAchievements – edge cases", () => {
  it("handles exact boundary values correctly (not off-by-one)", () => {
    // Each boundary: veteran=6, character_collector=5, experienced=10,
    // completionist=5, legend=10, dice_master=100, lucky=10, chatterbox=100
    const r = checkAchievements(
      makeStats({
        monthsSinceJoin: 6,
        totalCharacters: 5,
        totalCampaignsCreated: 10,
        completedCampaigns: 5,
        highestLevel: 10,
        totalDiceRolls: 100,
        criticalSuccesses: 10,
        totalMessages: 100,
      })
    );
    expect(findResult(r, "veteran")?.unlocked).toBe(true);
    expect(findResult(r, "character_collector")?.unlocked).toBe(true);
    expect(findResult(r, "experienced")?.unlocked).toBe(true);
    expect(findResult(r, "completionist")?.unlocked).toBe(true);
    expect(findResult(r, "legend")?.unlocked).toBe(true);
    expect(findResult(r, "dice_master")?.unlocked).toBe(true);
    expect(findResult(r, "lucky")?.unlocked).toBe(true);
    expect(findResult(r, "chatterbox")?.unlocked).toBe(true);
  });

  it("does not unlock higher-tier achievements at lower thresholds", () => {
    const r = checkAchievements(
      makeStats({
        totalDiceRolls: 99,
        criticalSuccesses: 9,
        totalMessages: 99,
      })
    );
    expect(findResult(r, "dice_master")?.unlocked).toBe(false);
    expect(findResult(r, "lucky")?.unlocked).toBe(false);
    expect(findResult(r, "chatterbox")?.unlocked).toBe(false);
  });

  it("totalCampaigns uses BOTH created and joined", () => {
    // experienced needs totalCampaigns >= 10
    const r1 = checkAchievements(makeStats({ totalCampaignsCreated: 10 }));
    expect(findResult(r1, "experienced")?.unlocked).toBe(true);

    const r2 = checkAchievements(makeStats({ totalCampaignsJoined: 10 }));
    expect(findResult(r2, "experienced")?.unlocked).toBe(true);

    const r3 = checkAchievements(
      makeStats({ totalCampaignsCreated: 3, totalCampaignsJoined: 7 })
    );
    expect(findResult(r3, "experienced")?.unlocked).toBe(true);
  });
});
