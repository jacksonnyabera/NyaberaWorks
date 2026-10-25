import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { site } from "@/lib/site";

let path = "/";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

describe("WhatsAppButton", () => {
  it("links to wa.me with digits only and an encoded greeting", () => {
    path = "/";
    render(<WhatsAppButton />);
    const link = screen.getByRole("link", { name: "Chat on WhatsApp" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe(`https://wa.me/${site.whatsappNumber}`);
    expect(site.whatsappNumber).toMatch(/^\d{11,15}$/);
    expect(url.searchParams.get("text")).toBe(site.whatsappGreeting);
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
  it.each(["/admin", "/admin/quotes", "/login", "/register", "/account/requests/quote/1"])(
    "is hidden on %s",
    (p) => {
      path = p;
      render(<WhatsAppButton />);
      expect(screen.queryByRole("link", { name: "Chat on WhatsApp" })).not.toBeInTheDocument();
    },
  );
});
