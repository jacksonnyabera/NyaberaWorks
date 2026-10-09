import { describe, expect, it } from "vitest";

import { formatDate, linesToList, listToLines } from "@/lib/admin-lists";

describe("admin list helpers", () => {
  it("turns one-per-line text into a clean list", () => {
    expect(linesToList("  First \r\n\r\nSecond\n   \nThird")).toEqual(["First", "Second", "Third"]);
    expect(linesToList("")).toEqual([]);
  });
  it("round-trips", () => {
    expect(linesToList(listToLines(["a", "b"]))).toEqual(["a", "b"]);
  });
  it("formats a calendar date without shifting the day", () => {
    expect(formatDate("2026-10-09")).toContain("9");
    expect(formatDate("2026-10-09")).toContain("2026");
  });
});
