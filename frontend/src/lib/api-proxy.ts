/**
 * Server-side pass-through from the website to the FastAPI backend.
 *
 * The browser only ever talks to the website's own address (/api/...), so
 * cookies stay same-site and no CORS is needed. In Docker + Caddy, Caddy routes
 * /api before it reaches Next.js and this code is not used. On hosts that put
 * only the website behind the domain (Cloud Run), this does the routing.
 */

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-request-id",
] as const;
const FORWARD_RESPONSE_HEADERS = ["content-type", "retry-after", "x-request-id"] as const;
const MAX_BODY_BYTES = 200_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

export type ProxyConfig = {
  apiBase: string;
  sharedSecret?: string;
  /** How many entries from the right of X-Forwarded-For hold the visitor (1 = the last). */
  hopsFromRight: number;
};

export function proxyConfigFromEnv(env: Record<string, string | undefined> = process.env): ProxyConfig {
  const apiBase = env.API_INTERNAL_URL || env.API_PROXY_TARGET || "http://127.0.0.1:8000";
  const hops = Number.parseInt(env.CLIENT_IP_HOPS_FROM_RIGHT ?? "1", 10);
  return {
    apiBase: apiBase.replace(/\/$/, ""),
    sharedSecret: env.PROXY_SHARED_SECRET || undefined,
    hopsFromRight: Number.isInteger(hops) && hops >= 1 ? hops : 1,
  };
}

/** The visitor's address as reported by the platform in front of us, or undefined. */
export function visitorIp(forwardedFor: string | null, hopsFromRight: number): string | undefined {
  if (!forwardedFor) return undefined;
  const parts = forwardedFor
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts[Math.max(0, parts.length - hopsFromRight)];
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, details: [], request_id: null } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function proxyToApi(request: Request, config: ProxyConfig): Promise<Response> {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith("/api/")) return jsonError(404, "NOT_FOUND", "Not found.");

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = visitorIp(request.headers.get("x-forwarded-for"), config.hopsFromRight);
  if (config.sharedSecret && ip) {
    headers.set("x-proxy-secret", config.sharedSecret);
    headers.set("x-client-ip", ip);
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) {
      return jsonError(413, "PAYLOAD_TOO_LARGE", "That request is too large.");
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.apiBase}${incoming.pathname}${incoming.search}`, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return jsonError(502, "BAD_GATEWAY", "The service is starting up. Please try again in a moment.");
  }

  const out = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);

  const noBody = upstream.status === 204 || upstream.status === 304;
  return new Response(noBody ? null : upstream.body, { status: upstream.status, headers: out });
}
