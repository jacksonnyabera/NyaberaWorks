import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { ResetPasswordForm, tokenFromHash } from "@/components/auth/ResetPasswordForm";
import { TwoFactorPanel } from "@/components/auth/TwoFactorPanel";
import { AxiosError } from "axios";

const login = vi.fn();
const setUser = vi.fn();
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ login, status: "anonymous", user: null, setUser }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const forgot = vi.fn();
const reset = vi.fn();
const start = vi.fn();
const enable = vi.fn();
const disable = vi.fn();
vi.mock("@/lib/auth-api", () => ({
  forgotPassword: (...a: unknown[]) => forgot(...a),
  resetPassword: (...a: unknown[]) => reset(...a),
  startTwoFactor: () => start(),
  enableTwoFactor: (...a: unknown[]) => enable(...a),
  disableTwoFactor: (...a: unknown[]) => disable(...a),
}));

function serverError(status: number, code: string, message: string) {
  const error = new AxiosError("x");
  error.response = { status, data: { error: { code, message } } } as never;
  return error;
}

beforeEach(() => vi.clearAllMocks());

describe("tokenFromHash", () => {
  it("reads the token from the fragment and rejects junk", () => {
    expect(tokenFromHash("#token=abcdefghijklmnopqrstuvwxyz_-0123")).toBe("abcdefghijklmnopqrstuvwxyz_-0123");
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#token=short")).toBeNull();
    expect(tokenFromHash("#token=<script>alert(1)</script>")).toBeNull();
  });
});

describe("LoginForm two-factor step", () => {
  it("asks for the code after the password is accepted, then signs in with it", async () => {
    login.mockRejectedValueOnce(serverError(401, "TOTP_REQUIRED", "Enter the 6-digit code."));
    login.mockResolvedValueOnce({ role: "ADMIN" });
    render(<LoginForm />);
    expect(screen.queryByLabelText(/authenticator code/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "boss@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "a long enough password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    const code = await screen.findByLabelText(/authenticator code/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(code, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
    expect(login.mock.calls[1][0]).toMatchObject({ totpCode: "123456" });
  });

  it("shows a wrong code as an error and links to password reset", async () => {
    login.mockRejectedValueOnce(serverError(401, "TOTP_REQUIRED", "Enter the code."));
    login.mockRejectedValueOnce(serverError(401, "INVALID_CODE", "That code is not correct."));
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /forgot your password/i })).toHaveAttribute("href", "/forgot-password");
    await userEvent.type(screen.getByLabelText("Email"), "boss@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "a long enough password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await userEvent.type(await screen.findByLabelText(/authenticator code/i), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("That code is not correct.")).toBeInTheDocument();
  });
});

describe("ForgotPasswordForm", () => {
  it("shows the same confirmation without saying whether the account exists", async () => {
    forgot.mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
    expect(forgot).toHaveBeenCalledWith("someone@example.com");
  });
  it("rejects an invalid email before calling the server", async () => {
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(forgot).not.toHaveBeenCalled();
  });
});

describe("ResetPasswordForm", () => {
  it("explains a link with no token", async () => {
    window.location.hash = "";
    render(<ResetPasswordForm />);
    expect(await screen.findByText(/not complete/i)).toBeInTheDocument();
  });
  it("sends the token from the fragment and clears it from the address bar", async () => {
    window.location.hash = "#token=abcdefghijklmnopqrstuvwxyz_-0123";
    reset.mockResolvedValue(undefined);
    render(<ResetPasswordForm />);
    await userEvent.type(await screen.findByLabelText("New password"), "a brand new phrase 77");
    await userEvent.type(screen.getByLabelText("Repeat new password"), "a brand new phrase 77");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));
    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
    expect(reset).toHaveBeenCalledWith({ token: "abcdefghijklmnopqrstuvwxyz_-0123", newPassword: "a brand new phrase 77" });
    expect(window.location.hash).toBe("");
  });
  it("blocks mismatched passwords", async () => {
    window.location.hash = "#token=abcdefghijklmnopqrstuvwxyz_-0123";
    render(<ResetPasswordForm />);
    await userEvent.type(await screen.findByLabelText("New password"), "a brand new phrase 77");
    await userEvent.type(screen.getByLabelText("Repeat new password"), "something else entirely");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });
  it("offers a new link when the old one is rejected", async () => {
    window.location.hash = "#token=abcdefghijklmnopqrstuvwxyz_-0123";
    reset.mockRejectedValue(serverError(400, "INVALID_RESET_LINK", "This reset link is not valid any more."));
    render(<ResetPasswordForm />);
    await userEvent.type(await screen.findByLabelText("New password"), "a brand new phrase 77");
    await userEvent.type(screen.getByLabelText("Repeat new password"), "a brand new phrase 77");
    await userEvent.click(screen.getByRole("button", { name: /set new password/i }));
    expect(await screen.findByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password");
  });
});

const admin = { id: "1", name: "Owner", email: "o@x.co", phone: null, role: "ADMIN", totpEnabled: false, createdAt: "" } as const;

describe("TwoFactorPanel", () => {
  it("walks through setup and shows recovery codes once", async () => {
    start.mockResolvedValue({ secret: "ABCDEFGHIJKLMNOP", otpauthUri: "otpauth://totp/x?secret=ABCDEFGHIJKLMNOP" });
    enable.mockResolvedValue(["aaaaa-bbbbb", "ccccc-ddddd"]);
    render(<TwoFactorPanel user={admin} />);
    expect(screen.getByText(/only thing protecting/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /set up two-factor/i }));
    expect(await screen.findByTestId("totp-secret")).toHaveTextContent("ABCDEFGHIJKLMNOP");
    await userEvent.type(screen.getByLabelText(/6-digit code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /turn on two-factor/i }));
    expect(await screen.findByTestId("recovery-codes")).toHaveTextContent("aaaaa-bbbbb");
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ totpEnabled: true }));
    await userEvent.click(screen.getByRole("button", { name: /i have saved them/i }));
    expect(screen.queryByTestId("recovery-codes")).not.toBeInTheDocument();
  });
  it("rejects a code that is not six digits without calling the server", async () => {
    start.mockResolvedValue({ secret: "ABCDEFGHIJKLMNOP", otpauthUri: "otpauth://x" });
    render(<TwoFactorPanel user={admin} />);
    await userEvent.click(screen.getByRole("button", { name: /set up two-factor/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "12ab");
    await userEvent.click(screen.getByRole("button", { name: /turn on two-factor/i }));
    expect(await screen.findByText(/6 digits/i)).toBeInTheDocument();
    expect(enable).not.toHaveBeenCalled();
  });
  it("turns two-factor off with password and code", async () => {
    disable.mockResolvedValue(undefined);
    render(<TwoFactorPanel user={{ ...admin, totpEnabled: true }} />);
    await userEvent.type(screen.getByLabelText("Password"), "my password here");
    await userEvent.type(screen.getByLabelText(/authenticator or recovery/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /turn off two-factor/i }));
    await waitFor(() => expect(disable).toHaveBeenCalledWith({ password: "my password here", code: "123456" }));
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ totpEnabled: false }));
  });
});
