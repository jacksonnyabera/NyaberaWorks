import { proxyConfigFromEnv, proxyToApi } from "@/lib/api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handle = (request: Request) => proxyToApi(request, proxyConfigFromEnv());

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
