import { z } from "zod";
import { isSafeImageUrl } from "@/lib/security/imageUrl";

export const MIN_CHARACTER_STAT = 3;
export const MAX_CHARACTER_STAT = 20;
export const MAX_CHARACTER_GOLD = 1_000_000;

export const characterStatsSchema = z.object({
  strength: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  dexterity: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  constitution: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  intelligence: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  wisdom: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
  charisma: z.number().int().min(MIN_CHARACTER_STAT).max(MAX_CHARACTER_STAT),
});

export const characterCreateSchema = z.object({
  name: z.string().min(1),
  race: z.string().min(1),
  class: z.string().min(1),
  level: z.number().int().min(1).max(20).optional(),
  experience: z.number().int().min(0).optional(),
  hp: z.number().int().min(0).optional(),
  maxHp: z.number().int().min(1).optional(),
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
});

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;

export const characterHpUpdateSchema = z.object({
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(1).optional(),
});

export type CharacterHpUpdateInput = z.infer<typeof characterHpUpdateSchema>;
