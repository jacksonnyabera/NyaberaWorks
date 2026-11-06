import { CtaBand } from "@/components/home/CtaBand";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { getProjects } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Work: projects and case studies",
  description:
    "Selected NyaberaWorks projects across business platforms, custom software, data tools and workflow automation.",
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const projects = await getProjects();
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
        intro="Selected work with project status stated clearly. Each case study explains the challenge, solution, technologies and delivered capabilities."
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
