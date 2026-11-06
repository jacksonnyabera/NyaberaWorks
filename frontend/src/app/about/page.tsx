import { CtaBand } from "@/components/home/CtaBand";
import { Tag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { JsonLd } from "@/components/seo/JsonLd";
import { skillGroups } from "@/content/general";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "About NyaberaWorks",
  description:
    "Meet NyaberaWorks, a Kenya-based software and technology studio building practical digital products, data solutions and workflow automation for businesses.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <PageHeader
        title="Technology built around the way people work."
        intro="NyaberaWorks is a Kenya-based software and technology company focused on making complex work clearer, simpler and more useful."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1.25fr_0.75fr] md:gap-16">
          <div className="space-y-5 text-lg">
            <p>
              Businesses do not need technology for its own sake. They need tools that help customers find them,
              help teams get work done and help decision-makers understand what is happening.
            </p>
            <p>
              NyaberaWorks brings together software engineering, data and automation to solve those practical
              problems. We work across business websites, custom web applications, Python-powered backends,
              connected systems, reporting and data products.
            </p>
            <p>
              Every engagement starts with a conversation about the people who will use the solution and the
              outcome the business needs. We agree the scope, timeline and cost before work begins, share progress
              during delivery and plan for a maintainable handover.
            </p>
            <p>
              Founded by {site.owner}, NyaberaWorks is based in Kenya and works with clients locally and remotely.
              Our approach is collaborative, direct and grounded in clear communication.
            </p>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <ButtonLink href="/quote">Discuss a project</ButtonLink>
              <ButtonLink href="/portfolio" variant="secondary">Explore our work</ButtonLink>
            </div>
          </div>

          <aside aria-label="Company overview" className="h-fit rounded-2xl border border-line bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">At a glance</p>
            <h2 className="mt-3 text-2xl">Human systems. Practical technology.</h2>
            <dl className="mt-5 divide-y divide-line text-[0.95rem]">
              <div className="py-3">
                <dt className="text-muted">Company</dt>
                <dd className="font-semibold">{site.name}</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Founded by</dt>
                <dd className="font-semibold">{site.owner}</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Based in</dt>
                <dd className="font-semibold">{site.location}</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Focus</dt>
                <dd className="font-semibold">Software, data, automation and integrations</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Code and selected projects</dt>
                <dd>
                  <a className="font-semibold text-teal underline-offset-4 hover:underline" href={site.github} target="_blank" rel="noopener noreferrer">
                    github.com/jacksonnyabera
                  </a>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </Section>

      <Section tone="panel" labelledBy="about-tools">
        <h2 id="about-tools" className="text-3xl sm:text-4xl">Our technical toolkit</h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">A practical stack for building, integrating and supporting digital products.</p>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-lg">{group.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => <Tag key={item}>{item}</Tag>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
