import { proxyConfigFromEnv, proxyToApi } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Hosts like Vercel cut functions off after 10 seconds by default. A sleeping free API needs
// up to a minute to wake, so ask for the longest the plan allows (ignored by other hosts).
export const maxDuration = 60;

const handle = (request: Request) => proxyToApi(request, proxyConfigFromEnv());

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
