// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxyConfigFromEnv, proxyToApi, visitorIp, type ProxyConfig } from "@/lib/api-proxy";

const config: ProxyConfig = { apiBase: "https://api.internal", sharedSecret: "s".repeat(40), hopsFromRight: 1 };

afterEach(() => vi.unstubAllGlobals());

function stubUpstream(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("visitorIp", () => {
  it("takes the entry the platform appended, not what the visitor supplied", () => {
    expect(visitorIp("6.6.6.6, 203.0.113.7", 1)).toBe("203.0.113.7");
    expect(visitorIp("203.0.113.7", 1)).toBe("203.0.113.7");
    expect(visitorIp("203.0.113.7, 10.0.0.1", 2)).toBe("203.0.113.7");
    expect(visitorIp(null, 1)).toBeUndefined();
    expect(visitorIp("", 1)).toBeUndefined();
  });
});

describe("proxyToApi", () => {
  it("forwards method, path, query, body and the allowed headers, with the client IP and secret", async () => {
    const fetchMock = stubUpstream(Response.json({ ok: true }, { status: 201 }));
    const response = await proxyToApi(
      new Request("https://nyaberaworks.co.ke/api/v1/contact-messages?x=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "nw_refresh=abc",
          "x-forwarded-for": "6.6.6.6, 203.0.113.7",
          "x-client-ip": "1.1.1.1", // a visitor trying to fake it
          "x-proxy-secret": "guess",
          host: "nyaberaworks.co.ke",
        },
        body: JSON.stringify({ hello: "world" }),
      }),
      config,
    );
    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.internal/api/v1/contact-messages?x=1");
    expect(init.method).toBe("POST");
    const sent = init.headers as Headers;
    expect(sent.get("cookie")).toBe("nw_refresh=abc");
    expect(sent.get("x-client-ip")).toBe("203.0.113.7");
    expect(sent.get("x-proxy-secret")).toBe(config.sharedSecret);
    expect(sent.get("host")).toBeNull();
    expect(new TextDecoder().decode(init.body)).toBe('{"hello":"world"}');
  });

  it("never passes visitor-supplied trust headers when no secret is configured", async () => {
    const fetchMock = stubUpstream(Response.json({}));
    await proxyToApi(
      new Request("https://x.test/api/v1/services", {
        headers: { "x-forwarded-for": "203.0.113.7", "x-client-ip": "1.1.1.1", "x-proxy-secret": "guess" },
      }),
      { ...config, sharedSecret: undefined },
    );
    const sent = fetchMock.mock.calls[0][1].headers as Headers;
    expect(sent.get("x-client-ip")).toBeNull();
    expect(sent.get("x-proxy-secret")).toBeNull();
  });

  it("returns every Set-Cookie header and disables caching", async () => {
    const upstream = new Response("{}", { status: 200 });
    upstream.headers.append("set-cookie", "nw_refresh=1; HttpOnly; Path=/api/v1/auth");
    upstream.headers.append("set-cookie", "nw_session=1; Path=/");
    stubUpstream(upstream);
    const response = await proxyToApi(new Request("https://x.test/api/v1/auth/login", { method: "POST", body: "{}" }), config);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 502 in the API's error shape when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const response = await proxyToApi(new Request("https://x.test/api/v1/services"), config);
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("BAD_GATEWAY");
  });

  it("rejects huge bodies and non-API paths", async () => {
    const fetchMock = stubUpstream(Response.json({}));
    const big = await proxyToApi(new Request("https://x.test/api/v1/bookings", { method: "POST", body: "x".repeat(300_000) }), config);
    expect(big.status).toBe(413);
    const other = await proxyToApi(new Request("https://x.test/admin"), config);
    expect(other.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes upstream errors through unchanged", async () => {
    stubUpstream(Response.json({ error: { code: "TOO_MANY_REQUESTS" } }, { status: 429, headers: { "retry-after": "60" } }));
    const response = await proxyToApi(new Request("https://x.test/api/v1/contact-messages", { method: "POST", body: "{}" }), config);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});

describe("proxyConfigFromEnv timeout", () => {
  it("defaults to 25 seconds and accepts a sane override", () => {
    expect(proxyConfigFromEnv({}).timeoutMs).toBe(25_000);
    expect(proxyConfigFromEnv({ API_PROXY_TIMEOUT_MS: "75000" }).timeoutMs).toBe(75_000);
    expect(proxyConfigFromEnv({ API_PROXY_TIMEOUT_MS: "5000000" }).timeoutMs).toBe(25_000);
  });
});
