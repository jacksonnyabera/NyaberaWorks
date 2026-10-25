"use client";

import { AccountPanel } from "@/components/auth/AccountPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { ClientInbox } from "@/components/conversations/ClientInbox";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader, Section } from "@/components/ui/Section";

function Content() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Your account" intro={`Signed in as ${user.email}`} />
      <Section>
        <h2 id="requests-title" className="mb-6 text-2xl">
          Your requests
        </h2>
        <ClientInbox />
      </Section>
      <Section>
        <AccountPanel user={user} />
      </Section>
    </>
  );
}

export function AccountContent() {
  return (
    <RequireAuth>
      <Content />
    </RequireAuth>
  );
}
