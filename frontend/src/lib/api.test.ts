import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";

import { toApiFailure } from "@/lib/api";

function failure(status: number, data: unknown): AxiosError {
  const error = new AxiosError("failed");
  error.response = { status, data } as AxiosResponse;
  return error;
}

describe("toApiFailure", () => {
  it("reports a network problem when there is no response", () => {
    expect(toApiFailure(new AxiosError("Network Error")).kind).toBe("network");
  });
  it("maps validation details onto fields", () => {
    const result = toApiFailure(
      failure(422, {
        error: { message: "Invalid", request_id: "abc12345", details: [{ field: "email", message: "Bad email" }] },
      }),
    );
    expect(result.kind).toBe("validation");
    expect(result.fieldErrors).toEqual({ email: "Bad email" });
    expect(result.requestId).toBe("abc12345");
  });
  it("flags rate limits", () => {
    expect(toApiFailure(failure(429, {})).kind).toBe("rate-limit");
  });
  it("hides server details from people", () => {
    const result = toApiFailure(failure(500, { error: { message: "stack trace here" } }));
    expect(result.kind).toBe("server");
    expect(result.message).not.toContain("stack trace");
  });
});

describe("toApiFailure for sign-in", () => {
  it("uses the server message for wrong credentials", () => {
    const result = toApiFailure(failure(401, { error: { message: "Incorrect email or password." } }));
    expect(result.kind).toBe("auth");
    expect(result.message).toBe("Incorrect email or password.");
  });
  it("maps a taken email to the email field", () => {
    const result = toApiFailure(
      failure(409, { error: { message: "Taken", details: [{ field: "email", message: "Already used" }] } }),
    );
    expect(result.kind).toBe("conflict");
    expect(result.fieldErrors).toEqual({ email: "Already used" });
  });
  it("shows the lock-out message from the server", () => {
    const result = toApiFailure(failure(429, { error: { message: "Try again in 15 minutes." } }));
    expect(result.kind).toBe("rate-limit");
    expect(result.message).toBe("Try again in 15 minutes.");
  });
});
