import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { FormSkeleton } from "@/components/forms/FormParts";
import { PageHeader, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        title="Create an account"
        intro="An account lets you keep your details in one place for quotes and bookings."
      />
      <Section>
        <div className="max-w-md">
          <Suspense fallback={<FormSkeleton />}>
            <RegisterForm />
          </Suspense>
        </div>
      </Section>
    </>
  );
}
