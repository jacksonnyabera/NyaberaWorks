import { FormBoundary } from "@/components/forms/FormBoundary";
import { QuoteForm } from "@/components/forms/QuoteForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { getServiceChoices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Request a quote",
  description:
    "Describe your project and receive a written scope, timeline and price for websites, web applications, Python backends, automation and data solutions.",
  path: "/quote",
});

export default async function QuotePage() {
  const services = await getServiceChoices();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Request a quote", path: "/quote" },
        ])}
      />
      <PageHeader
        title="Request a quote"
        intro="Tell us what your business wants to build or improve. NyaberaWorks will prepare a written scope, timeline and price. The quote is free and there is no obligation."
      />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <FormBoundary>
            <QuoteForm services={services} />
          </FormBoundary>
          <aside aria-label="What happens next" className="space-y-6">
            <h2 className="text-xl">What happens next</h2>
            <ol className="list-decimal space-y-4 pl-5 text-lg marker:text-teal">
              <li>Our team reviews your request and asks questions if anything is unclear.</li>
              <li>You receive a written scope, timeline and price, usually within two working days.</li>
              <li>If you accept, we agree the next steps. Nothing starts before that.</li>
            </ol>
            <div className="rounded-card border border-line bg-panel p-5">
              <h3 className="font-semibold">To help us prepare an accurate quote</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                <li>Describe the business problem and who will use the solution.</li>
                <li>List any essential features, tools or systems it must connect to.</li>
                <li>Share a target launch date if you have one.</li>
                <li>Choose an approximate budget, or select “Not sure yet”.</li>
              </ul>
            </div>
            <p className="text-sm text-muted">
              You do not need a technical specification. A clear description in everyday language is enough to start the conversation.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
