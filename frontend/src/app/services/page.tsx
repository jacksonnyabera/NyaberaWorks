import Link from "next/link";

import { CtaBand } from "@/components/home/CtaBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { formatStartingPrice } from "@/content/services";
import { getServices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Services: web development, Python, automation and biomedical support",
  description:
    "Custom websites, business web applications, Python backends and APIs, automation, data reporting, integrations, maintenance, biomedical engineering technical support and technical documentation.",
  path: "/services",
});

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: services.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absoluteUrl(`/services/${s.slug}`),
            name: s.title,
          })),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <PageHeader
        title="Services"
        intro="Every service starts with a written scope, timeline and price. Pick the closest match, or describe your problem and I will tell you which fits."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/quote" size="lg">
            Request a quote
          </ButtonLink>
          <ButtonLink href="/book" size="lg" variant="secondary">
            Book a service
          </ButtonLink>
        </div>
      </PageHeader>

      <Section>
        <ul className="divide-y divide-line border-y border-line">
          {services.map((s) => (
            <li key={s.slug} className="grid gap-4 py-8 md:grid-cols-[1.5fr_1fr_auto] md:items-start md:gap-10">
              <div>
                <h2 className="text-2xl">
                  <Link href={`/services/${s.slug}`} className="hover:text-teal">
                    {s.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-prose text-muted">{s.summary}</p>
              </div>
              <dl className="space-y-1 text-[0.95rem]">
                <div className="flex gap-2">
                  <dt className="text-muted">Typical timeline:</dt>
                  <dd>{s.timeline}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Price:</dt>
                  <dd>{formatStartingPrice(s)}</dd>
                </div>
              </dl>
              <Link
                href={`/services/${s.slug}`}
                className="font-semibold text-teal underline-offset-4 hover:underline md:self-center"
              >
                See details
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Not sure which service you need?" body="Describe the problem in a few sentences. I will tell you what fits, or say honestly if I am not the right person." />
    </>
  );
}
