import { afterEach, describe, expect, it, vi } from "vitest";

import { services as bundled } from "@/content/services";
import { getService, getServices } from "@/lib/catalog";

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.unstubAllGlobals());

describe("catalog data layer", () => {
  it("uses the API when it answers", async () => {
    vi.stubGlobal("fetch", respond(200, [{ slug: "x", title: "From the database" }]));
    expect(await getServices()).toEqual([{ slug: "x", title: "From the database" }]);
  });

  it("falls back to bundled content when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await getServices()).toEqual(bundled);
    expect((await getService("python-automation"))?.slug).toBe("python-automation");
  });

  it("falls back when the API fails with a server error", async () => {
    vi.stubGlobal("fetch", respond(500, {}));
    expect(await getServices()).toEqual(bundled);
  });

  it("treats a 404 from the API as 'does not exist', not as a reason to fall back", async () => {
    vi.stubGlobal("fetch", respond(404, { error: { code: "NOT_FOUND" } }));
    expect(await getService("python-automation")).toBeUndefined();
  });
});
