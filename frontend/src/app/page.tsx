import Link from "next/link";

import { CtaBand } from "@/components/home/CtaBand";
import { FaqList } from "@/components/home/FaqList";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { TrustStrip } from "@/components/home/TrustStrip";
import { ProjectPanel } from "@/components/portfolio/ProjectPanel";
import { Tag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { processSteps, reasons, skillGroups } from "@/content/general";
import { formatStartingPrice } from "@/content/services";
import { getProjects, getServices } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${site.name} | ${site.tagline}`,
  description:
    "NyaberaWorks builds business websites, custom software, data dashboards and workflow automation that help teams work smarter and serve customers better.",
  path: "/",
});

const outcomes = [
  {
    number: "01",
    title: "Win more of the right enquiries",
    body: "Give customers a clear way to discover your business, understand your offer and take the next step.",
  },
  {
    number: "02",
    title: "Make everyday work simpler",
    body: "Replace repetitive admin and disconnected spreadsheets with useful, connected digital workflows.",
  },
  {
    number: "03",
    title: "Turn information into direction",
    body: "Bring business data into clear dashboards and reporting that support better decisions.",
  },
];

const capabilities = [
  { title: "Digital products", body: "Business websites, customer portals and custom web applications.", mark: "01" },
  { title: "Data and intelligence", body: "Dashboards, reporting, data processing and practical predictive analysis.", mark: "02" },
  { title: "Automation and integration", body: "Connect tools, reduce repetitive work and make information move reliably.", mark: "03" },
];

export default async function HomePage() {
  const [services, projects] = await Promise.all([getServices(), getProjects()]);
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-line">
        <div className="ecg-paper absolute inset-0 -z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-28 -top-36 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#d6d0e8]/55 blur-3xl" />
        <Container className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:py-28">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d6d0e8] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4936a8]">
              <span className="h-2 w-2 rounded-full bg-[#8271e8]" />
              Software · Data · Automation
            </p>
            <h1 id="hero-title" className="max-w-3xl text-[2.8rem] leading-[0.99] sm:text-6xl lg:text-[4.6rem]">
              Make your next move a <span className="text-[#4936a8]">smarter</span> one.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              We design and build digital tools that help businesses move forward — from customer-facing websites
              to custom software, connected workflows and decision-ready data.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/quote" size="lg">Discuss a project <span aria-hidden="true">↗</span></ButtonLink>
              <ButtonLink href="/portfolio" size="lg" variant="secondary">Explore our work</ButtonLink>
            </div>
            <p className="mt-5 text-sm text-muted">Kenya-based. Working with ambitious teams wherever they are.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
            <div className="absolute -left-5 top-12 h-28 w-28 rounded-[2rem] bg-[#8271e8]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#d6d0e8] bg-[#19182c] p-5 text-white shadow-[0_28px_80px_-35px_rgba(25,24,44,0.6)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8271e8]" />
                  <span className="text-sm font-semibold tracking-wide">THE HUMAN SYSTEMS APPROACH</span>
                </div>
                <span className="font-mono text-xs text-[#b9b1d8]">NW / 01</span>
              </div>
              <div className="py-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9b1d8]">From complexity</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center text-xs text-[#e5e0f6]">People</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center text-xs text-[#e5e0f6]">Process</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center text-xs text-[#e5e0f6]">Data</div>
                </div>
                <div className="mx-auto flex h-12 items-center justify-center">
                  <div className="h-8 w-px bg-gradient-to-b from-[#8271e8] to-[#c9c0ff]" />
                </div>
                <div className="rounded-2xl border border-[#8271e8]/60 bg-[#4936a8]/35 p-5 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#8271e8] font-display text-xl font-bold">N</div>
                  <p className="mt-3 font-display text-2xl font-semibold">A system that works</p>
                  <p className="mt-1 text-sm text-[#d6d0e8]">Clearer work. Better decisions. Real progress.</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#b9b1d8]">
                <span>BUILD. SOLVE. DELIVER.</span>
                <span>NYABERAWORKS</span>
              </div>
            </div>
            <div className="float-soft absolute -bottom-5 -left-5 rounded-2xl border border-[#d6d0e8] bg-white px-4 py-3 shadow-xl sm:-left-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Our focus</p>
              <p className="font-display text-lg font-bold text-ink">Useful by design.</p>
            </div>
          </div>
        </Container>
      </section>

      <TrustStrip />

      <Section labelledBy="outcomes-title">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            id="outcomes-title"
            title="Technology should move your business forward."
            intro="The best solution is not the most complicated one. It is the one that makes a meaningful difference to the people using it."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {outcomes.map((item) => (
              <article key={item.number} className="rounded-2xl border border-line bg-white/70 p-5">
                <span className="font-mono text-sm font-semibold text-[#8271e8]">{item.number}</span>
                <h3 className="mt-8 text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="panel" labelledBy="capabilities-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="capabilities-title"
            title="Connected capabilities. Practical outcomes."
            intro="From the first conversation to launch and support, we focus on building the right thing — clearly scoped and made to last."
          />
          <Link href="/services" className="font-semibold text-teal underline-offset-4 hover:underline">Explore all solutions ↗</Link>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {capabilities.map((item) => (
            <article key={item.mark} className="group rounded-2xl border border-line bg-paper p-7 transition duration-200 hover:-translate-y-1 hover:border-[#b7addd] hover:shadow-lg">
              <span className="font-mono text-sm font-semibold text-[#8271e8]">{item.mark}</span>
              <h3 className="mt-8 text-2xl">{item.title}</h3>
              <p className="mt-3 text-muted">{item.body}</p>
              <span className="mt-8 inline-flex text-sm font-semibold text-teal">Explore capability <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </article>
          ))}
        </div>
      </Section>

      <Section labelledBy="services-title">
        <SectionHeading
          id="services-title"
          title="Ways we can work together"
          intro="Choose a starting point. Every engagement begins with understanding the problem, then agreeing on scope, timing and cost."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.slug} className="flex flex-col rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-lg">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5e0f6] text-teal">
                <ServiceIcon slug={service.slug} />
              </span>
              <h3 className="mt-5 text-xl">
                <Link href={`/services/${service.slug}`} className="hover:text-teal">{service.title}</Link>
              </h3>
              <p className="mt-2 flex-1 text-muted">{service.summary}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                <span className="font-semibold text-ink-soft">{formatStartingPrice(service)}</span>
                <Link href={`/services/${service.slug}`} className="font-semibold text-teal underline-offset-4 hover:underline">View details →</Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="ink" labelledBy="approach-title">
        <div className="grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b9b1d8]">A better way to build</p>
            <h2 id="approach-title" className="mt-5 text-3xl text-paper sm:text-4xl">Good technology starts with understanding people.</h2>
            <p className="mt-5 text-lg text-mist">We take time to understand the people, processes and decisions behind the brief — then build a solution that fits the real world.</p>
            <div className="mt-8"><ButtonLink href="/about" variant="inverse">Get to know NyaberaWorks</ButtonLink></div>
          </div>
          <dl className="divide-y divide-white/15 border-y border-white/15">
            {reasons.slice(0, 4).map((reason, index) => (
              <div key={reason.title} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-5">
                <span className="font-mono text-sm text-[#b9b1d8]">0{index + 1}</span>
                <div>
                  <dt className="font-display text-xl font-semibold text-paper">{reason.title}</dt>
                  <dd className="mt-1.5 text-mist">{reason.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section labelledBy="work-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="work-title"
            title="Selected work"
            intro="A look at products and systems we have worked on. Project stages are labelled honestly, so you can see what is live and what is still in development."
          />
          <ButtonLink href="/portfolio" variant="secondary">View all work</ButtonLink>
        </div>
        <div className="mt-14 space-y-16 sm:space-y-24">
          {featured.map((project, index) => (
            <ProjectPanel key={project.slug} project={project} flip={index % 2 === 1} />
          ))}
        </div>
      </Section>

      <Section tone="panel" labelledBy="process-title">
        <SectionHeading id="process-title" title="A clear path from idea to delivery" intro="No mystery process. You know what happens next, what it costs and where the work stands." />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-[#8271e8] pt-5">
              <span className="font-mono text-2xl font-semibold text-teal" aria-hidden="true">0{index + 1}</span>
              <h3 className="mt-3 text-xl">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand
        title="Have a challenge we can help solve?"
        body="Tell us what is getting in the way. We will help you shape a practical next step — with a clear scope, timeline and quote."
      />

      <Section labelledBy="faq-title">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <SectionHeading id="faq-title" title="A few useful answers" intro="Not sure where to begin? Start here, or send us your question directly." />
            <p className="mt-6"><Link href="/faq" className="font-semibold text-teal underline underline-offset-4">Visit the FAQ</Link></p>
          </div>
          <FaqList limit={5} />
        </div>
      </Section>
    </>
  );
}
