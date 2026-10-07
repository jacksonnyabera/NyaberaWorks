import type { ReactNode } from "react";

import { Container, PageHeader } from "@/components/ui/Section";

export const legalUpdated = "7 October 2026";

/** Shared layout for the privacy policy and terms. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <div className="py-14 sm:py-20">
        <Container>
          <div className="max-w-3xl space-y-10 [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_li]:mt-2 [&_p]:mt-4 [&_p]:text-lg [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-lg">
            <p className="text-sm text-muted">Last updated {legalUpdated}</p>
            {children}
          </div>
        </Container>
      </div>
    </>
  );
}
