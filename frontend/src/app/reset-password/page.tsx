import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PageHeader, Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return (
    <>
      <PageHeader title="Choose a new password" intro="Pick a password you do not use anywhere else." />
      <Section>
        <div className="max-w-md">
          <ResetPasswordForm />
        </div>
      </Section>
    </>
  );
}
