import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
