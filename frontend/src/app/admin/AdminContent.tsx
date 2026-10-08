"use client";

import { AdminOverviewPanel } from "@/components/auth/AdminOverviewPanel";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader, Section } from "@/components/ui/Section";

export function AdminContent() {
  return (
    <RequireAuth role="ADMIN">
      <PageHeader title="Admin" intro="A summary of what needs your attention." />
      <Section>
        <AdminOverviewPanel />
        <p className="mt-10 max-w-prose text-muted">
          Lists for messages, quotes and bookings, plus service and portfolio management, are added in the
          next batch.
        </p>
      </Section>
    </RequireAuth>
  );
}
