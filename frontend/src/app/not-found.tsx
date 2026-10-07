import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Container className="py-24 sm:py-32">
      <h1 className="max-w-2xl text-4xl sm:text-5xl">We could not find that page</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        The link may be old or mistyped. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Go to the homepage
        </ButtonLink>
        <ButtonLink href="/services" size="lg" variant="secondary">
          See services
        </ButtonLink>
      </div>
    </Container>
  );
}
