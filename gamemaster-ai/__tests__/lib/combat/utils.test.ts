import { describe, it, expect, vi } from "vitest";
import {
  resolveAttack,
  parseDamageDice,
  sanitizeNpcCombatStats,
  sanitizeParticipants,
  proficiencyBonus,
} from "@/lib/combat/utils";

describe("parseDamageDice", () => {
  it("parses a valid NdM spec", () => {
    expect(parseDamageDice("2d6")).toEqual({ count: 2, sides: 6 });
  });

  it("clamps dice count and rejects odd-sided dice", () => {
    expect(parseDamageDice("99d6")).toEqual({ count: 20, sides: 6 });
    expect(parseDamageDice("1d7", { count: 1, sides: 8 })).toEqual({ count: 1, sides: 8 });
  });

  it("falls back on garbage input", () => {
    expect(parseDamageDice(undefined)).toEqual({ count: 1, sides: 6 });
    expect(parseDamageDice("not-dice", { count: 1, sides: 4 })).toEqual({ count: 1, sides: 4 });
  });
});

describe("proficiencyBonus", () => {
  it("follows the 5e progression", () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(20)).toBe(6);
  });
});

describe("sanitizeNpcCombatStats", () => {
  it("returns null when no combat field present", () => {
    expect(sanitizeNpcCombatStats({ name: "x" })).toBeNull();
    expect(sanitizeNpcCombatStats(null)).toBeNull();
  });

  it("clamps hp/maxHp/ac to bounds", () => {
    expect(sanitizeNpcCombatStats({ hp: 999999, ac: 99 })).toEqual({ hp: 1000, maxHp: 1000, ac: 30 });
  });

  it("keeps hp ≤ maxHp", () => {
    expect(sanitizeNpcCombatStats({ hp: 50, maxHp: 20 })).toEqual({ hp: 20, maxHp: 20, ac: 10 });
  });

  it("carries optional attackBonus and damageDice when valid", () => {
    expect(sanitizeNpcCombatStats({ hp: 30, ac: 14, attackBonus: 5, damageDice: "2d6" })).toEqual({
      hp: 30,
      maxHp: 30,
      ac: 14,
      attackBonus: 5,
      damageDice: "2d6",
    });
  });

  it("drops an invalid damageDice spec", () => {
    const result = sanitizeNpcCombatStats({ hp: 10, damageDice: "bogus" });
    expect(result?.damageDice).toBeUndefined();
  });
});

describe("sanitizeParticipants accepts JSON strings (combat-route bug fix)", () => {
  it("parses a JSON string column, not just arrays", () => {
    const json = JSON.stringify([
      { id: "A", name: "A", type: "player", initiative: 12, hp: 10, maxHp: 10, ac: 13 },
    ]);
    const parsed = sanitizeParticipants(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("A");
  });
});

describe("resolveAttack", () => {
  it("natural 20 always crits and doubles damage dice", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99); // d20=20, each d6=6
    const r = resolveAttack({
      attackBonus: 0,
      targetAc: 50, // unreachable normally, but crit ignores AC
      damageDice: { count: 1, sides: 6 },
      damageBonus: 2,
    });
    expect(r.crit).toBe(true);
    expect(r.hit).toBe(true);
    expect(r.damage).toBe(6 + 6 + 2); // doubled dice + bonus
    spy.mockRestore();
  });

  it("natural 1 always misses", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0); // d20=1
    const r = resolveAttack({
      attackBonus: 100,
      targetAc: 1,
      damageDice: { count: 1, sides: 6 },
      damageBonus: 0,
    });
    expect(r.critMiss).toBe(true);
    expect(r.hit).toBe(false);
    expect(r.damage).toBe(0);
    spy.mockRestore();
  });

  it("misses when roll + bonus is below AC", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 = floor(10)+1 = 11
    const r = resolveAttack({
      attackBonus: 0,
      targetAc: 20,
      damageDice: { count: 1, sides: 6 },
      damageBonus: 0,
    });
    expect(r.hit).toBe(false);
    expect(r.damage).toBe(0);
    spy.mockRestore();
  });
});
