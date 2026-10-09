import Link from "next/link";

import { CtaBand } from "@/components/home/CtaBand";
import { FaqList } from "@/components/home/FaqList";
import { HeartbeatTrace } from "@/components/home/HeartbeatTrace";
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
    "Independent developer in Nairobi building websites, web applications, Python backends, automation and data solutions, with a biomedical engineering perspective. Request a quote or book a service.",
  path: "/",
});

const audiences = [
  "Small businesses that need a website that brings in enquiries",
  "Teams running on spreadsheets and chat groups who need one reliable system",
  "Clinics, labs and facilities that want equipment records and maintenance tracked properly",
  "Startups that need a backend or API built carefully",
];

const biomedicalAreas = [
  {
    title: "Equipment records and maintenance",
    body: "Inventory, service schedules, due dates and repair history in one place instead of paper and scattered files.",
  },
  {
    title: "Data tools for health settings",
    body: "Reports and dashboards from the numbers a facility already collects, built with privacy in mind.",
  },
  {
    title: "Clear technical documentation",
    body: "Procedures, user guides and reports written so the next person can follow them.",
  },
];

export default async function HomePage() {
  const [services, projects] = await Promise.all([getServices(), getProjects()]);
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line">
        <div className="ecg-paper absolute inset-0" aria-hidden="true" />
        <Container className="relative pt-14 pb-6 sm:pt-24 sm:pb-8">
          <h1 id="hero-title" className="max-w-4xl text-[2.6rem] leading-[1.03] sm:text-6xl md:text-7xl">
            Practical software for businesses that need things to work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            I&apos;m Jackson Nyabera, an independent developer in Nairobi. I build websites, web applications,
            Python backends and automation, and I&apos;m studying biomedical engineering, which shapes how I
            approach healthcare-related work.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/quote" size="lg">
              Start a project
            </ButtonLink>
            <ButtonLink href="/portfolio" size="lg" variant="secondary">
              View my work
            </ButtonLink>
          </div>
          <div className="mt-12 sm:mt-16">
            <HeartbeatTrace />
          </div>
        </Container>
      </section>

      {/* Who I help */}
      <Section labelledBy="who-title">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <SectionHeading
            id="who-title"
            title="Who I work with"
            intro="Clients who know what is slowing them down, and want it fixed by someone they can talk to directly."
          />
          <ul className="divide-y divide-line border-y border-line">
            {audiences.map((a) => (
              <li key={a} className="py-4 text-lg">
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Services */}
      <Section tone="panel" labelledBy="services-title">
        <SectionHeading
          id="services-title"
          title="What I build"
          intro="Each service comes with a written scope, a timeline and a price before any work begins."
        />
        <ul className="mt-12 grid gap-x-14 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.slug} className="border-t border-line py-6">
              <h3 className="text-xl">
                <Link href={`/services/${s.slug}`} className="hover:text-teal">
                  {s.title}
                </Link>
              </h3>
              <p className="mt-2 text-muted">{s.summary}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="text-ink-soft">{formatStartingPrice(s)}</span>
                <Link
                  href={`/services/${s.slug}`}
                  className="font-semibold text-teal underline-offset-4 hover:underline"
                >
                  See details
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Featured projects */}
      <Section labelledBy="work-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="work-title"
            title="Things I have built"
            intro="Real projects with their actual status, including the ones that are still prototypes."
          />
          <ButtonLink href="/portfolio" variant="secondary">
            All projects
          </ButtonLink>
        </div>
        <div className="mt-14 space-y-16 sm:space-y-24">
          {featured.map((p, i) => (
            <ProjectPanel key={p.slug} project={p} flip={i % 2 === 1} />
          ))}
        </div>
      </Section>

      {/* Why work with me */}
      <Section tone="panel" labelledBy="why-title">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <SectionHeading id="why-title" title="Why work with me" />
          <dl className="divide-y divide-line border-y border-line">
            {reasons.map((r) => (
              <div key={r.title} className="py-5">
                <dt className="font-display text-xl font-semibold">{r.title}</dt>
                <dd className="mt-1.5 text-muted">{r.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* Process */}
      <Section labelledBy="process-title">
        <SectionHeading id="process-title" title="How a project runs" intro="Four stages, in this order." />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <li key={step.title} className="border-t-2 border-teal pt-5">
              <span className="font-display text-3xl font-semibold text-teal" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-2 text-xl">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Skills */}
      <Section tone="panel" labelledBy="skills-title">
        <SectionHeading
          id="skills-title"
          title="Tools I work with"
          intro="Chosen for reliability and maintainability, not novelty."
        />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-lg">{g.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Biomedical positioning */}
      <Section tone="ink" labelledBy="bio-title">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <div>
            <h2 id="bio-title" className="text-3xl sm:text-4xl md:text-[2.75rem]">
              Software, with a biomedical engineering perspective
            </h2>
            <p className="mt-5 text-lg text-mist">
              I&apos;m studying biomedical engineering while building software, so projects in or near healthcare
              start with the right questions about records, safety and the people who use the equipment.
            </p>
            <p className="mt-4 text-mist">
              This is software and technical support. It does not replace inspection, calibration or sign-off by
              licensed engineers where regulations require it.
            </p>
            <div className="mt-8">
              <ButtonLink href="/services/biomedical-engineering-technical-support" variant="inverse">
                See the biomedical support service
              </ButtonLink>
            </div>
          </div>
          <ul className="divide-y divide-white/15 border-y border-white/15">
            {biomedicalAreas.map((a) => (
              <li key={a.title} className="py-6">
                <h3 className="text-xl text-paper">{a.title}</h3>
                <p className="mt-1.5 text-mist">{a.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* FAQ */}
      <Section labelledBy="faq-title">
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div>
            <SectionHeading id="faq-title" title="Common questions" />
            <p className="mt-6">
              <Link href="/faq" className="font-semibold text-teal underline underline-offset-4">
                Read all questions
              </Link>
            </p>
          </div>
          <FaqList limit={5} />
        </div>
      </Section>

      <CtaBand />

      {/* Contact */}
      <Section labelledBy="contact-title">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <SectionHeading
            id="contact-title"
            title="Prefer to talk first?"
            intro="Send a message, or reach me directly. I reply within one to two working days."
          />
          <div>
            <ul className="divide-y divide-line border-y border-line text-lg">
              <li className="flex flex-wrap justify-between gap-2 py-4">
                <span className="text-muted">Email</span>
                <a className="font-semibold text-teal underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
              <li className="flex flex-wrap justify-between gap-2 py-4">
                <span className="text-muted">Phone</span>
                <a className="font-semibold text-teal underline-offset-4 hover:underline" href={site.phoneHref}>
                  {site.phoneDisplay}
                </a>
              </li>
              <li className="flex flex-wrap justify-between gap-2 py-4">
                <span className="text-muted">Based in</span>
                <span className="font-semibold">{site.location}</span>
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact">Send a message</ButtonLink>
              <ButtonLink href={site.whatsappHref} variant="secondary" external>
                Chat on WhatsApp
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
