import { z } from "zod";

// These rules mirror backend/app/modules/auth/schemas.py. The server is the real check.
const email = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address").max(254);
const name = z.string().trim().min(2, "Enter your name").max(100, "Keep your name under 100 characters");
const phone = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{6,19}$/, "Enter a valid phone number, for example 0712 345 678"),
]);
const newPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({ name, email, phone, password: newPassword })
  .refine((v) => v.password.toLowerCase() !== v.email.toLowerCase(), {
    path: ["password"],
    message: "The password must not be your email address",
  });

export const profileSchema = z.object({ name, phone });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword,
    confirmPassword: z.string().min(1, "Repeat the new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
