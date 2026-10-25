"use client";

import { ClientConversation } from "@/components/conversations/ClientConversation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader, Section } from "@/components/ui/Section";
import type { RequestKind } from "@/lib/conversations-api";

export function RequestContent({ kind, id }: { kind: RequestKind; id: string }) {
  return (
    <RequireAuth>
      <PageHeader title="Your request" intro="Messages and quotations for this request." />
      <Section>
        <div className="max-w-3xl">
          <ClientConversation kind={kind} id={id} />
        </div>
      </Section>
    </RequireAuth>
  );
}
