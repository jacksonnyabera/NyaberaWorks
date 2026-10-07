import { describe, expect, it } from "vitest";

import { faqs } from "@/content/general";
import { projects } from "@/content/projects";
import { formatStartingPrice, services } from "@/content/services";

describe("content integrity", () => {
  it("has unique service slugs and nine services", () => {
    const slugs = services.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(services).toHaveLength(9);
  });
  it("gives every service the fields the page needs", () => {
    for (const s of services) {
      expect(s.deliverables.length).toBeGreaterThan(0);
      expect(s.technologies.length).toBeGreaterThan(0);
      expect(s.timeline).not.toBe("");
      expect(formatStartingPrice(s)).not.toBe("");
    }
  });
  it("has unique project slugs and a live NyumbaDirect link", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(projects.find((p) => p.slug === "nyumbadirect")?.liveUrl).toBe("https://nyumbadirect.co.ke");
  });
  it("has FAQs", () => {
    expect(faqs.length).toBeGreaterThan(3);
  });
});
