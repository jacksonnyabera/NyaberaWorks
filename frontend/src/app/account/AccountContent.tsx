"use client";

import { AccountPanel } from "@/components/auth/AccountPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader, Section } from "@/components/ui/Section";

function Content() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Your account" intro={`Signed in as ${user.email}`} />
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
