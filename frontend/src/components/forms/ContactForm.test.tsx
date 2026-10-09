import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/forms/ContactForm";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

function setup() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ContactForm services={[{ slug: "python-automation", title: "Python Automation" }]} />
    </QueryClientProvider>,
  );
}

describe("ContactForm", () => {
  it("shows validation errors and does not submit an empty form", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getAllByText("Choose a service").length).toBeGreaterThan(1);
  });
});
