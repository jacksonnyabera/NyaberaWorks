import type { MetadataRoute } from "next";

import { getProjects, getServices } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

// Rebuilt at most hourly, so services and projects added in the admin area appear without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects] = await Promise.all([getServices(), getProjects()]);
  const fixed = ["/", "/services", "/portfolio", "/about", "/faq", "/contact", "/quote", "/book", "/privacy", "/terms"];
  return [
    ...fixed.map((path) => ({
      url: absoluteUrl(path),
      priority: path === "/" ? 1 : 0.7,
    })),
    ...services.map((s) => ({ url: absoluteUrl(`/services/${s.slug}`), priority: 0.8 })),
    ...projects.map((p) => ({ url: absoluteUrl(`/portfolio/${p.slug}`), priority: 0.6 })),
  ];
}
