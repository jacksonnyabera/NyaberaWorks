import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";

export function CtaBand({
  title = "Let's make your next move a smarter one.",
  body = "Tell us what you are trying to achieve. We will help shape a practical solution, with a clear scope, timeline and quote.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section aria-labelledby="cta-title" className="on-ink bg-teal-deep py-16 text-white sm:py-20">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#d6d0e8]">BUILD. SOLVE. DELIVER.</p>
          <h2 id="cta-title" className="text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-3 text-lg text-teal-tint">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/quote" variant="inverse" size="lg">Discuss a project</ButtonLink>
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
