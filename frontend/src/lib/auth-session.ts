import axios from "axios";

import { setAccessToken } from "@/lib/auth-store";
import type { SessionResponse } from "@/lib/auth-types";

/**
 * Plain client for the sign-in endpoints. It has no interceptors on purpose:
 * the automatic "refresh and retry" logic lives on the main client, and these
 * calls must never trigger it (that would loop).
 */
export const authClient = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** The server sets a readable `nw_session=1` flag when a sign-in exists. It holds nothing secret. */
export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part === "nw_session=1");
}

let inflight: Promise<SessionResponse | null> | null = null;

/**
 * Ask the server for a fresh access token using the httpOnly refresh cookie.
 * Calls made at the same moment share one request, because each refresh
 * replaces the cookie.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  if (!inflight) {
    inflight = authClient
      .post<SessionResponse>("/v1/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
