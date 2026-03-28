import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Yeni sifreler eslesmiyor",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
