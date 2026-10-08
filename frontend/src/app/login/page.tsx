import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { FormSkeleton } from "@/components/forms/FormParts";
import { PageHeader, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <PageHeader title="Log in" intro="Access your account and requests." />
      <Section>
        <div className="max-w-md">
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </Section>
    </>
  );
}
