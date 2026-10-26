import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  "custom-website-development": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </>
  ),
  "business-web-applications": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M13 9h5M13 13h5M13 17h3" />
    </>
  ),
  "python-backend-api-development": (
    <>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" />
    </>
  ),
  "python-automation": (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "data-analysis-reporting": (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  "database-api-integration": (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  "website-maintenance": (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
    </>
  ),
  "biomedical-engineering-technical-support": (
    <>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </>
  ),
  "technical-documentation": (
    <>
      <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
};

/** Small line icon for a service. Decorative: the service title carries the meaning. */
export function ServiceIcon({ slug }: { slug: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[slug] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
