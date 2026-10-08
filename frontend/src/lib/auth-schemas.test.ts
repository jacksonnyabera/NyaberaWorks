import { describe, expect, it } from "vitest";

import { changePasswordSchema, loginSchema, registerSchema } from "@/lib/auth-schemas";

describe("registerSchema", () => {
  const valid = { name: "Amina Otieno", email: "amina@example.com", phone: "", password: "correct horse battery" };
  it("accepts a good sign-up", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });
  it("requires 10+ characters and rejects the email as password", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "amina@example.com" }).success).toBe(false);
  });
  it("checks the phone format when given", () => {
    expect(registerSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: "0712 345 678" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("needs an email and a password", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("requires the new passwords to match", () => {
    const base = { currentPassword: "old password here", newPassword: "a brand new passphrase" };
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "different" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: base.newPassword }).success).toBe(true);
  });
});
