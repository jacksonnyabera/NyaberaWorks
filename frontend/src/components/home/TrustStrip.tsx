import { Container } from "@/components/ui/Section";
import { site } from "@/lib/site";

// Only things this site already commits to elsewhere (process, FAQ, contact page).
const facts = [
  { label: "Based in", value: site.location },
  { label: "Before work starts", value: "Written scope, timeline and price" },
  { label: "Reply time", value: "One to two working days" },
  { label: "Who you deal with", value: "The developer, directly" },
];

export function TrustStrip() {
  return (
    <section aria-label="At a glance" className="border-b border-line bg-panel">
      <Container>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 py-6 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-sm text-muted">{f.label}</dt>
              <dd className="mt-1 font-display text-base font-semibold sm:text-lg">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
