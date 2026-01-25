import { z } from "zod";

export const characterStatsSchema = z.object({
  strength: z.number().int(),
  dexterity: z.number().int(),
  constitution: z.number().int(),
  intelligence: z.number().int(),
  wisdom: z.number().int(),
  charisma: z.number().int(),
});

export const characterCreateSchema = z.object({
  name: z.string().min(1),
  race: z.string().min(1),
  class: z.string().min(1),
  level: z.number().int().min(1).max(20).optional(),
  experience: z.number().int().min(0).optional(),
  hp: z.number().int().min(0).optional(),
  maxHp: z.number().int().min(1).optional(),
  stats: characterStatsSchema.optional(),
  background: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;

export const characterHpUpdateSchema = z.object({
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(1).optional(),
});

export type CharacterHpUpdateInput = z.infer<typeof characterHpUpdateSchema>;
