import { afterEach, describe, expect, it } from "vitest";

import { hasSessionHint } from "@/lib/auth-session";

afterEach(() => {
  document.cookie = "nw_session=; max-age=0; path=/";
});

describe("hasSessionHint", () => {
  it("is false without the flag cookie", () => {
    expect(hasSessionHint()).toBe(false);
  });
  it("is true when the server has set the flag", () => {
    document.cookie = "nw_session=1; path=/";
    expect(hasSessionHint()).toBe(true);
  });
});
