import { describe, expect, it } from "vitest";

import { homeFor, safeNext } from "@/lib/auth-redirect";

describe("safeNext", () => {
  it("allows pages on this site", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("/admin?tab=1")).toBe("/admin?tab=1");
  });
  it("blocks anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
  it("sends each role to its own home", () => {
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("CLIENT")).toBe("/account");
  });
});
