import { CtaBand } from "@/components/home/CtaBand";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { projects } from "@/content/projects";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Work: projects and case studies",
  description:
    "Projects by Jackson Nyabera: NyumbaDirect, RemoteHub Kenya, a hospital equipment management prototype, data and automation work, and the NyaberaWorks platform.",
  path: "/portfolio",
});

export default function PortfolioPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: projects.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absoluteUrl(`/portfolio/${p.slug}`),
            name: p.title,
          })),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Work", path: "/portfolio" },
        ])}
      />
      <PageHeader
        title="Work"
        intro="Real projects, each with its status stated plainly: live, built, prototype or learning project. Every case study follows the same path: problem, solution, technology, features and result."
      >
        <ButtonLink href="/quote" size="lg">
          Start a project
        </ButtonLink>
      </PageHeader>

      <Section>
        <ul className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.slug}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Want something like this built for you?" />
    </>
  );
}
