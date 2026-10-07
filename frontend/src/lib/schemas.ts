import { z } from "zod";

import { budgetOptions, timeSlots } from "@/content/general";

// These rules are mirrored by the FastAPI backend (added in Batch B).
// The browser check is for convenience; the server check is the real one.

const name = z.string().trim().min(2, "Enter your name").max(100, "Keep your name under 100 characters");
const email = z.string().trim().min(1, "Enter your email address").email("Enter a valid email address").max(254);
const phoneRule = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,19}$/, "Enter a valid phone number, for example 0712 345 678");
const optionalPhone = z.union([z.literal(""), phoneRule]);
const service = z.string().trim().min(1, "Choose a service");
// Hidden spam trap. Real people never fill it in.
const website = z.string().max(0).optional();

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const contactSchema = z.object({
  name,
  email,
  phone: optionalPhone,
  service,
  message: z.string().trim().min(10, "Write at least 10 characters").max(2000, "Keep it under 2000 characters"),
  website,
});

export const quoteSchema = z.object({
  name,
  email,
  phone: optionalPhone,
  service,
  budget: z.enum(budgetOptions, { message: "Choose a budget range" }),
  deadline: z
    .string()
    .refine((v) => v === "" || v >= todayIso(), "Choose a date that is today or later"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the project in at least 20 characters")
    .max(4000, "Keep it under 4000 characters"),
  website,
});

export const bookingSchema = z.object({
  name,
  email,
  phone: phoneRule,
  service,
  preferredDate: z
    .string()
    .min(1, "Choose a date")
    .refine((v) => v === "" || v >= todayIso(), "Choose a date that is today or later"),
  preferredTime: z.enum(timeSlots, { message: "Choose a time" }),
  requirements: z.string().trim().min(10, "Write at least 10 characters").max(2000, "Keep it under 2000 characters"),
  website,
});

export type ContactValues = z.infer<typeof contactSchema>;
export type QuoteValues = z.infer<typeof quoteSchema>;
export type BookingValues = z.infer<typeof bookingSchema>;
