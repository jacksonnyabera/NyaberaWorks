import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";

export function CtaBand({
  title = "Have a problem worth solving with software?",
  body = "Tell me what you need. You get a written scope, timeline and price, and the quote is free.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section aria-labelledby="cta-title" className="on-ink bg-teal-deep py-16 text-white sm:py-20">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 id="cta-title" className="text-3xl sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-lg text-teal-tint">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/quote" variant="inverse" size="lg">
            Request a quote
          </ButtonLink>
          <ButtonLink
            href="/book"
            size="lg"
            variant="secondary"
            className="border-white/60 text-white hover:border-white hover:bg-white hover:text-ink"
          >
            Book a service
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
