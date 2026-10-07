"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-24 sm:py-32">
      <h1 className="max-w-2xl text-4xl sm:text-5xl">This page failed to load</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Something went wrong on our side. Try again, and if it keeps happening, email the address in the footer.
      </p>
      <Button size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
