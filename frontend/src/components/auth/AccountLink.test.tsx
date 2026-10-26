import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountLinks } from "@/components/auth/AccountLink";

let auth: { status: string; user: unknown } = { status: "anonymous", user: null };
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/lib/conversations-api", () => ({ getUnread: async () => 0 }));

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountLinks />
    </QueryClientProvider>,
  );
}

describe("AccountLinks", () => {
  it("shows Log in to visitors and never mentions Admin", () => {
    auth = { status: "anonymous", user: null };
    show();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });
  it("does not show an Admin link even when the signed-in user is the admin", () => {
    auth = { status: "authenticated", user: { id: "1", name: "Owner", email: "o@x.co", phone: null, role: "ADMIN", totpEnabled: false, createdAt: "" } };
    show();
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });
});
