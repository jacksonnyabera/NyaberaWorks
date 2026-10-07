import axios, { AxiosError } from "axios";

/**
 * Browser-side API client. It always calls relative /api/... URLs:
 *  - in development Next.js forwards them to FastAPI (see next.config.ts)
 *  - in production Caddy routes them to FastAPI (one domain, no CORS)
 * The browser never talks to the database. Only FastAPI does.
 */
export const api = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** Endpoint paths (relative to /api). Batch B implements these in FastAPI. */
export const endpoints = {
  contact: "/v1/contact-messages",
  quote: "/v1/quote-requests",
  booking: "/v1/bookings",
} as const;

export type FieldErrors = Record<string, string>;

export type ApiFailure = {
  kind: "validation" | "server" | "network" | "rate-limit";
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
    if (status === 422 || status === 400) {
      return {
        kind: "validation",
        message: body.error?.message ?? "Some details need fixing. Check the highlighted fields.",
        fieldErrors: extractFieldErrors(body.error?.details),
        requestId,
      };
    }
    if (status === 429) {
      return {
        kind: "rate-limit",
        message: "Too many attempts. Wait a minute and try again.",
        fieldErrors: {},
        requestId,
      };
    }
    return {
      kind: "server",
      message: "Something went wrong on our side. Your message was not sent.",
      fieldErrors: {},
      requestId,
    };
  }
  return {
    kind: "server",
    message: "Something unexpected happened. Your message was not sent.",
    fieldErrors: {},
  };
}
