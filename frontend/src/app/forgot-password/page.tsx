import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageHeader, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return (
    <>
      <PageHeader title="Forgot password" intro="We will email you a link to choose a new one." />
      <Section>
        <div className="max-w-md">
          <ForgotPasswordForm />
        </div>
      </Section>
    </>
  );
}
