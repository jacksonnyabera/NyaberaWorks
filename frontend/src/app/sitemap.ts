import type { MetadataRoute } from "next";

import { projects } from "@/content/projects";
import { services } from "@/content/services";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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
