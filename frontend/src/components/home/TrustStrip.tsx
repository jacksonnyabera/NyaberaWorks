import { Container } from "@/components/ui/Section";
import { site } from "@/lib/site";

const facts = [
  { label: "Based in", value: site.location },
  { label: "Before work starts", value: "Written scope, timeline and price" },
  { label: "Response time", value: "One to two working days" },
  { label: "Working style", value: "Collaborative and transparent" },
];

export function TrustStrip() {
  return (
    <section aria-label="Working with NyaberaWorks" className="border-b border-line bg-panel">
      <Container>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 py-6 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{fact.label}</dt>
              <dd className="mt-1 font-display text-base font-semibold sm:text-lg">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
