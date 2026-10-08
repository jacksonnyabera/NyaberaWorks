/**
 * Only allow redirects to pages on this site. Blocks "//evil.com",
 * "https://evil.com" and "/\evil.com" style tricks after sign-in.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function homeFor(role: "CLIENT" | "ADMIN"): string {
  return role === "ADMIN" ? "/admin" : "/account";
}
