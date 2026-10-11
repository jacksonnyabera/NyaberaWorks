import type { NextConfig } from "next";

// /api/* is forwarded to FastAPI by src/app/api/[...path]/route.ts (development
// and Cloud Run). With Docker + Caddy, Caddy routes /api before Next.js sees it.

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Set NEXT_OUTPUT=standalone in the Docker build (Batch E). Left off locally
  // because standalone output can be awkward on Windows.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
