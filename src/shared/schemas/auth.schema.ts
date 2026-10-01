import { z } from "zod";
import { firstPasswordProblem } from "../password";

/** Strong-password policy for creating or changing a password (login keeps accepting any existing one). */
export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  const problem = firstPasswordProblem(password);
  if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  email: z.string().trim().email("Correo electrónico inválido"),
  password: newPasswordSchema,
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
  password: newPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
