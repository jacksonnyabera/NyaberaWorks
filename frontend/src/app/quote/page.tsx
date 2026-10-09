import { FormBoundary } from "@/components/forms/FormBoundary";
import { QuoteForm } from "@/components/forms/QuoteForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { getServiceChoices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Request a quote",
  description:
    "Describe your project and receive a written scope, timeline and price for websites, web applications, Python backends, automation, data work or biomedical engineering support.",
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
        intro="Tell me what you want to build or fix. You get a written scope, timeline and price. The quote is free and there is no obligation."
      />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <FormBoundary>
            <QuoteForm services={services} />
          </FormBoundary>
          <aside aria-label="What happens next" className="space-y-6">
            <h2 className="text-xl">What happens next</h2>
            <ol className="list-decimal space-y-4 pl-5 text-lg marker:text-teal">
              <li>I read your request and ask questions if anything is unclear.</li>
              <li>You receive a written scope, timeline and price, usually within two working days.</li>
              <li>If you accept, we agree the next steps. Nothing starts before that.</li>
            </ol>
            <p className="text-muted">
              A rough budget helps me suggest the right approach. If you are not sure, choose &ldquo;Not sure yet&rdquo;.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
