import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireAuth } from "@/components/auth/RequireAuth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin",
}));

let auth: { status: string; user: unknown; loggedOut?: boolean } = { status: "loading", user: null };
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => auth }));

const client = { id: "1", name: "A", email: "a@b.co", phone: null, role: "CLIENT", totpEnabled: false, createdAt: "" };
const admin = { ...client, role: "ADMIN" };

beforeEach(() => replace.mockClear());

describe("RequireAuth", () => {
  it("shows a loading state and hides the page while checking", () => {
    auth = { status: "loading", user: null };
    render(<RequireAuth><p>secret</p></RequireAuth>);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it("sends visitors to the login page and remembers where they were going", () => {
    auth = { status: "anonymous", user: null };
    render(<RequireAuth><p>secret</p></RequireAuth>);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fadmin");
  });
  it("sends people home after they choose to log out", () => {
    auth = { status: "anonymous", user: null, loggedOut: true };
    render(<RequireAuth><p>secret</p></RequireAuth>);
    expect(replace).toHaveBeenCalledWith("/");
  });
  it("blocks clients from admin pages", () => {
    auth = { status: "authenticated", user: client };
    render(<RequireAuth role="ADMIN"><p>secret</p></RequireAuth>);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByText("You do not have access to this page")).toBeInTheDocument();
  });
  it("lets admins in", () => {
    auth = { status: "authenticated", user: admin };
    render(<RequireAuth role="ADMIN"><p>secret</p></RequireAuth>);
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
