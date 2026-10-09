import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaBand } from "@/components/home/CtaBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { Tag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Section";
import { formatStartingPrice } from "@/content/services";
import { getService, getServices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};
  return pageMetadata({
    title: service.title,
    description: service.summary,
    path: `/services/${service.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const others = (await getServices()).filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.description,
          url: absoluteUrl(`/services/${service.slug}`),
          provider: { "@id": `${site.url}/#business` },
          areaServed: "Kenya",
          ...(service.startingPriceKes != null
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: "KES",
                  price: service.startingPriceKes,
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />

      <header className="relative overflow-hidden border-b border-line">
        <div className="ecg-paper absolute inset-0" aria-hidden="true" />
        <Container className="relative py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/services" className="underline-offset-4 hover:underline">
              Services
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{service.title}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl md:text-6xl">{service.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">{service.summary}</p>
        </Container>
      </header>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl sm:text-3xl">What this is</h2>
              <p className="mt-4 max-w-prose text-lg">{service.description}</p>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl">The problem it solves</h2>
              <p className="mt-4 max-w-prose text-lg">{service.problem}</p>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl">What you get</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex gap-3 py-3.5 text-lg">
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-1.5 h-5 w-5 shrink-0 text-teal"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl">Technologies</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {service.technologies.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </ul>
            </div>
            {service.note ? (
              <p className="max-w-prose rounded-card border border-line bg-panel p-4 text-[0.95rem]">
                {service.note}
              </p>
            ) : null}
          </div>

          <aside aria-label="Book or request a quote" className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-card border border-line bg-white p-6">
              <dl className="divide-y divide-line">
                <div className="pb-4">
                  <dt className="text-sm text-muted">Typical timeline</dt>
                  <dd className="mt-0.5 font-semibold">{service.timeline}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-sm text-muted">Price</dt>
                  <dd className="mt-0.5 font-semibold">{formatStartingPrice(service)}</dd>
                </div>
                <div className="pt-4">
                  <dt className="text-sm text-muted">Best for</dt>
                  <dd className="mt-0.5">{service.bestFor}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-col gap-3">
                <ButtonLink href={`/quote?service=${service.slug}`} size="lg">
                  Request a quote
                </ButtonLink>
                <ButtonLink href={`/book?service=${service.slug}`} size="lg" variant="secondary">
                  Book this service
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-muted">Quotes are free. Nothing starts until you agree to the scope and price.</p>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="panel" labelledBy="more-services">
        <h2 id="more-services" className="text-2xl sm:text-3xl">
          Other services
        </h2>
        <ul className="mt-8 grid gap-8 md:grid-cols-3">
          {others.map((s) => (
            <li key={s.slug}>
              <h3 className="text-xl">
                <Link href={`/services/${s.slug}`} className="hover:text-teal">
                  {s.title}
                </Link>
              </h3>
              <p className="mt-2 text-muted">{s.summary}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
