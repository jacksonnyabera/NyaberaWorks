import { CtaBand } from "@/components/home/CtaBand";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, Section } from "@/components/ui/Section";
import { getProjects } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Work: projects and case studies",
  description:
    "Explore NyaberaWorks projects across business platforms, custom software, data tools and workflow automation. See each project's status, capabilities and technology.",
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const projects = await getProjects();
  const liveProjects = projects.filter((project) => project.status === "Live").length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: projects.map((project, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/portfolio/${project.slug}`),
            name: project.title,
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
        title="Work that solves real problems"
        intro="Explore platforms, software and automation projects. Each entry states its current status and separates delivered capabilities from prototypes and work in progress."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ButtonLink href="/quote" size="lg">
            Start a project
          </ButtonLink>
          <p className="text-sm text-muted">
            {projects.length} projects documented · {liveProjects} live
          </p>
        </div>
      </PageHeader>

      <Section>
        <PortfolioGrid projects={projects} />
      </Section>

      <CtaBand
        title="Have a problem worth solving?"
        body="Tell us what your team needs to improve. We will help shape a practical solution, scope and next step."
      />
    </>
  );
}
