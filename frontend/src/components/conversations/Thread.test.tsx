import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThreadView } from "@/components/conversations/Thread";
import type { LeadDetail } from "@/lib/conversations-api";

const detail: LeadDetail = {
  kind: "quote",
  id: "1",
  reference: "NW-Q-ABC",
  service: "python-automation",
  status: "quoted",
  createdAt: "2026-10-01T10:00:00Z",
  summary: [["Project description", "Automate reports"]],
  messages: [
    { id: "m1", authorRole: "ADMIN", body: "Happy to help", createdAt: "2026-10-02T10:00:00Z", read: true },
    { id: "m2", authorRole: "CLIENT", body: "Great, thanks", createdAt: "2026-10-03T10:00:00Z", read: false },
  ],
  quotations: [
    { id: "q1", amountKes: 85000, details: "Scope and deliverables", validUntil: "2026-11-30", status: "sent", expired: false, createdAt: "2026-10-04T10:00:00Z", respondedAt: null },
  ],
  canReply: true,
};

describe("ThreadView", () => {
  it("shows the original request, both sides of the conversation and the quotation", () => {
    render(<ThreadView detail={detail} viewer="CLIENT" quotationActions={() => <button>Accept quotation</button>} />);
    expect(screen.getByText("Automate reports")).toBeInTheDocument();
    expect(screen.getByText("Happy to help")).toBeInTheDocument();
    expect(screen.getByText("Great, thanks")).toBeInTheDocument();
    expect(screen.getByText("KES 85,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept quotation" })).toBeInTheDocument();
  });
  it("marks an expired quotation as expired", () => {
    const expired = { ...detail, quotations: [{ ...detail.quotations[0], expired: true }] };
    render(<ThreadView detail={expired} viewer="CLIENT" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});
