import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { projects } from "@/content/projects";
import { services } from "@/content/services";

// The backend's starter data (backend/app/seed/*.json) is generated from these
// files. If this fails, regenerate the JSON so a fresh install matches the bundled content.
function seed(name: string): Record<string, unknown>[] {
  const file = path.resolve(process.cwd(), "..", "backend", "app", "seed", name);
  return JSON.parse(readFileSync(file, "utf-8"));
}
const withoutOrder = (rows: Record<string, unknown>[]) =>
  rows.map(({ sortOrder: _order, ...rest }) => {
    void _order;
    return rest;
  });

describe("backend seed data", () => {
  it("matches the bundled services", () => {
    expect(withoutOrder(seed("services.json"))).toEqual(JSON.parse(JSON.stringify(services)));
  });
  it("matches the bundled projects", () => {
    expect(withoutOrder(seed("projects.json"))).toEqual(JSON.parse(JSON.stringify(projects)));
  });
});
