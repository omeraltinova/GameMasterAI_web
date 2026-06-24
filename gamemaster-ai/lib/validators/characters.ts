import { z } from "zod";
import { isSafeImageUrl } from "@/lib/security/imageUrl";

export const MIN_CHARACTER_STAT = 3;
export const MAX_CHARACTER_STAT = 20;
export const MAX_CHARACTER_GOLD = 1_000_000;
export const MAX_CHARACTER_LEVEL = 20;
// Generous ceiling that still blocks the "near-immortal" abuse: even a level-20
// d12 class with a huge CON tops out well under this.
export const MAX_CHARACTER_HP = 1000;
// 5e-style cumulative XP threshold is level*1000 in this codebase; cap a touch
// above the level-20 requirement so create-time XP can't be set arbitrarily high.
export const MAX_CHARACTER_EXPERIENCE = MAX_CHARACTER_LEVEL * 1000;

export const characterStatsSchema = z.object({
  strength: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  dexterity: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  constitution: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  intelligence: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  wisdom: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  charisma: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
});

export const characterCreateSchema = z
  .object({
    name: z.string().min(1),
    race: z.string().min(1),
    class: z.string().min(1),
    level: z.number().int().min(1).max(MAX_CHARACTER_LEVEL).optional(),
    experience: z.number().int().min(0).max(MAX_CHARACTER_EXPERIENCE).optional(),
    hp: z.number().int().min(0).max(MAX_CHARACTER_HP).optional(),
    maxHp: z.number().int().min(1).max(MAX_CHARACTER_HP).optional(),
    gold: z.number().int().min(0).max(MAX_CHARACTER_GOLD).optional(),
    stats: characterStatsSchema.optional(),
    background: z.string().optional().nullable(),
    appearance: z.string().optional().nullable(),
    backstory: z.string().optional().nullable(),
    imageUrl: z
      .string()
      .trim()
      .refine((value) => isSafeImageUrl(value, { allowDataUrl: true }), {
        message: "Geçersiz görsel URL'i. Yalnızca güvenli URL'ler kabul edilir.",
      })
      .optional()
      .nullable(),
  })
  // Current HP can never exceed max HP at creation time.
  .refine(
    (data) => data.hp === undefined || data.maxHp === undefined || data.hp <= data.maxHp,
    { message: "HP, maksimum HP değerini aşamaz", path: ["hp"] },
  );

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;

export const characterHpUpdateSchema = z
  .object({
    hp: z.number().int().min(0).max(MAX_CHARACTER_HP),
    maxHp: z.number().int().min(1).max(MAX_CHARACTER_HP).optional(),
  })
  .refine((data) => data.maxHp === undefined || data.hp <= data.maxHp, {
    message: "HP, maksimum HP değerini aşamaz",
    path: ["hp"],
  });

export type CharacterHpUpdateInput = z.infer<typeof characterHpUpdateSchema>;
