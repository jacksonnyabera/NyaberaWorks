import { CtaBand } from "@/components/home/CtaBand";
import { Tag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { JsonLd } from "@/components/seo/JsonLd";
import { skillGroups } from "@/content/general";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "About Jackson Nyabera",
  description:
    "Jackson Nyabera is a self-taught software developer in Nairobi, Kenya, studying biomedical engineering and building websites, Python backends and automation for clients.",
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
        title="An independent developer who is also studying biomedical engineering"
        intro="NyaberaWorks is the practice of Jackson Nyabera, based in Nairobi, Kenya."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-16">
          <div className="space-y-5 text-lg">
            <p>
              I&apos;m a self-taught software developer. I learned by building: Python programs, web applications,
              a job board with M-Pesa payments, a hospital equipment tracker and a house-hunting platform that is
              live today.
            </p>
            <p>
              I&apos;m also studying biomedical engineering. That combination matters when a project involves
              medical equipment, clinical data or the people who rely on both: I know the vocabulary, and I know
              which questions to ask before writing code.
            </p>
            <p>
              I work on my own, so you speak to the person doing the work. I put scope, timeline and price in
              writing first, build in stages you can review, and tell you plainly when something is a bad idea or
              outside what I do.
            </p>
            <p>
              I focus on the Kenyan market and know its tools, including M-Pesa through Safaricom Daraja, and I
              work with clients anywhere.
            </p>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <ButtonLink href="/quote">Start a project</ButtonLink>
              <ButtonLink href="/portfolio" variant="secondary">
                View my work
              </ButtonLink>
            </div>
          </div>

          <aside aria-label="At a glance" className="h-fit rounded-card border border-line bg-white p-6">
            <h2 className="text-xl">At a glance</h2>
            <dl className="mt-4 divide-y divide-line text-[0.95rem]">
              <div className="py-3">
                <dt className="text-muted">Name</dt>
                <dd className="font-semibold">{site.owner}</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Based in</dt>
                <dd className="font-semibold">{site.location}</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Focus</dt>
                <dd className="font-semibold">Websites, web apps, Python backends, automation, data</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Studying</dt>
                <dd className="font-semibold">Biomedical engineering</dd>
              </div>
              <div className="py-3">
                <dt className="text-muted">Code</dt>
                <dd>
                  <a
                    className="font-semibold text-teal underline-offset-4 hover:underline"
                    href={site.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/jacksonmaobe
                  </a>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </Section>

      <Section tone="panel" labelledBy="about-tools">
        <h2 id="about-tools" className="text-3xl sm:text-4xl">
          Tools I work with
        </h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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

      <CtaBand />
    </>
  );
}
