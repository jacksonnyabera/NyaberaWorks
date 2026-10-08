import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { getAccessToken, setAccessToken } from "@/lib/auth-store";
import { refreshSession } from "@/lib/auth-session";

/**
 * Browser-side API client. It always calls relative /api/... URLs:
 *  - in development Next.js forwards them to FastAPI (see next.config.ts)
 *  - in production Caddy routes them to FastAPI (one domain, no CORS)
 * The browser never talks to the database. Only FastAPI does.
 *
 * Signed-in requests carry the in-memory access token. If the server answers
 * 401 (token expired), the client refreshes the session once and retries.
 */
export const api = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401 && error.config) {
      const config = error.config as RetryableConfig;
      if (!config._retried && getAccessToken()) {
        config._retried = true;
        const session = await refreshSession();
        if (session) {
          config.headers.set("Authorization", `Bearer ${session.accessToken}`);
          return api.request(config);
        }
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  },
);

/** Endpoint paths (relative to /api). */
export const endpoints = {
  contact: "/v1/contact-messages",
  quote: "/v1/quote-requests",
  booking: "/v1/bookings",
  register: "/v1/auth/register",
  login: "/v1/auth/login",
  refresh: "/v1/auth/refresh",
  logout: "/v1/auth/logout",
  me: "/v1/auth/me",
  changePassword: "/v1/auth/change-password",
  adminOverview: "/v1/admin/overview",
} as const;

export type FieldErrors = Record<string, string>;

export type ApiFailure = {
  kind: "validation" | "server" | "network" | "rate-limit" | "auth" | "conflict";
  message: string;
  fieldErrors: FieldErrors;
  requestId?: string;
};

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    request_id?: string;
  };
};

function extractFieldErrors(details: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!Array.isArray(details)) return out;
  for (const item of details) {
    if (item && typeof item === "object") {
      const { field, message } = item as { field?: unknown; message?: unknown };
      if (typeof field === "string" && typeof message === "string" && !(field in out)) {
        out[field] = message;
      }
    }
  }
  return out;
}

/** Turn any thrown error into something a form can show to a person. */
export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return {
        kind: "network",
        message: "We could not reach the server. Check your connection and try again.",
        fieldErrors: {},
      };
    }
    const body = (error.response.data ?? {}) as ErrorBody;
    const status = error.response.status;
    const requestId = body.error?.request_id;
    const serverMessage = body.error?.message;
    const fieldErrors = extractFieldErrors(body.error?.details);
    if (status === 422 || status === 400) {
      return {
        kind: "validation",
        message: serverMessage ?? "Some details need fixing. Check the highlighted fields.",
        fieldErrors,
        requestId,
      };
    }
    if (status === 409) {
      return {
        kind: "conflict",
        message: serverMessage ?? "That already exists.",
        fieldErrors,
        requestId,
      };
    }
    if (status === 401 || status === 403) {
      return {
        kind: "auth",
        message: serverMessage ?? "You need to sign in to do that.",
        fieldErrors: {},
        requestId,
      };
    }
    if (status === 429) {
      return {
        kind: "rate-limit",
        message: serverMessage ?? "Too many attempts. Wait a minute and try again.",
        fieldErrors: {},
        requestId,
      };
    }
    return {
      kind: "server",
      message: "Something went wrong on our side. Please try again.",
      fieldErrors: {},
      requestId,
    };
  }
  return {
    kind: "server",
    message: "Something unexpected happened. Please try again.",
    fieldErrors: {},
  };
}
