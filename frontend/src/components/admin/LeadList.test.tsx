import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageList } from "@/components/admin/LeadPanels";
import * as adminApi from "@/lib/admin-api";

vi.mock("@/lib/admin-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin-api")>()),
  listLeads: vi.fn(),
  updateLead: vi.fn(),
}));

const row = {
  id: "1",
  reference: "NW-C-ABCD2345",
  name: "Amina Otieno",
  email: "amina@example.com",
  phone: null,
  service: "website-maintenance",
  status: "new",
  adminNotes: null,
  createdAt: "2026-10-09T07:00:00Z",
  updatedAt: "2026-10-09T07:00:00Z",
  message: "I need help keeping my website updated.",
};

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MessageList />
    </QueryClientProvider>,
  );
}

describe("admin message list", () => {
  beforeEach(() => {
    vi.mocked(adminApi.listLeads).mockResolvedValue({ items: [row], total: 1, page: 1, pageSize: 15 });
    vi.mocked(adminApi.updateLead).mockResolvedValue({ ...row, status: "read" });
  });

  it("lists messages with reference, name and status", async () => {
    setup();
    expect(await screen.findByText("NW-C-ABCD2345")).toBeInTheDocument();
    expect(screen.getAllByText("Amina Otieno").length).toBeGreaterThan(0);
    expect(screen.getByText("Page 1 of 1 · 1 in total")).toBeInTheDocument();
  });

  it("changes the status and saves notes", async () => {
    setup();
    await userEvent.click(await screen.findByText("NW-C-ABCD2345"));
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "read");
    await userEvent.type(screen.getByLabelText(/Your notes/), "Called back");
    await userEvent.click(save);
    await waitFor(() =>
      expect(adminApi.updateLead).toHaveBeenCalledWith("contact-messages", "1", {
        status: "read",
        adminNotes: "Called back",
      }),
    );
  });

  it("shows a friendly empty state", async () => {
    vi.mocked(adminApi.listLeads).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 15 });
    setup();
    expect(await screen.findByText("No messages here")).toBeInTheDocument();
  });
});
