import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaBand } from "@/components/home/CtaBand";
import { ProjectCover } from "@/components/portfolio/ProjectCover";
import { JsonLd } from "@/components/seo/JsonLd";
import { StatusBadge, Tag } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Section";
import { getProject, getProjects } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return pageMetadata({
    title: `${project.title}: case study`,
    description: project.summary,
    path: `/portfolio/${project.slug}`,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const others = (await getProjects()).filter((p) => p.slug !== project.slug).slice(0, 3);

  const blocks: { title: string; body: string }[] = [
    { title: "The problem", body: project.problem },
    { title: "The solution", body: project.solution },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary,
          url: absoluteUrl(`/portfolio/${project.slug}`),
          author: { "@id": `${site.url}/#jackson` },
          ...(project.liveUrl ? { sameAs: [project.liveUrl] } : {}),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Work", path: "/portfolio" },
          { name: project.title, path: `/portfolio/${project.slug}` },
        ])}
      />

      <header className="relative overflow-hidden border-b border-line">
        <div className="ecg-paper absolute inset-0" aria-hidden="true" />
        <Container className="relative py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/portfolio" className="underline-offset-4 hover:underline">
              Work
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{project.title}</span>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <span className="text-sm text-muted">{project.category}</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl md:text-6xl">{project.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">{project.summary}</p>
          {project.liveUrl ? (
            <div className="mt-8">
              <ButtonLink href={project.liveUrl} external size="lg">
                Visit the live site
              </ButtonLink>
            </div>
          ) : null}
        </Container>
      </header>

      <Section>
        <ProjectCover motif={project.motif} className="mx-auto aspect-[8/5] w-full max-w-4xl sm:aspect-[2/1]" />

        <div className="mx-auto mt-14 grid max-w-4xl gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div className="space-y-12">
            {blocks.map((b) => (
              <div key={b.title}>
                <h2 className="text-2xl sm:text-3xl">{b.title}</h2>
                <p className="mt-4 max-w-prose text-lg">{b.body}</p>
              </div>
            ))}
            <div>
              <h2 className="text-2xl sm:text-3xl">Features</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {project.features.map((f) => (
                  <li key={f} className="py-3.5 text-lg">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl">Result and status</h2>
              <p className="mt-4 max-w-prose text-lg">{project.result}</p>
              {project.caveat ? (
                <p className="mt-4 max-w-prose rounded-card border border-line bg-panel p-4 text-[0.95rem]">
                  {project.caveat}
                </p>
              ) : null}
            </div>
          </div>

          <aside aria-label="Project details" className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-card border border-line bg-white p-6">
              <h2 className="text-lg">Technology</h2>
              {project.technologies.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-muted">Technology details are not listed for this project.</p>
              )}
              <div className="mt-6 flex flex-col gap-3">
                <ButtonLink href="/quote" size="lg">
                  Start a similar project
                </ButtonLink>
                {project.liveUrl ? (
                  <ButtonLink href={project.liveUrl} external size="lg" variant="secondary">
                    Visit the live site
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="panel" labelledBy="more-work">
        <h2 id="more-work" className="text-2xl sm:text-3xl">
          More work
        </h2>
        <ul className="mt-8 grid gap-8 md:grid-cols-3">
          {others.map((p) => (
            <li key={p.slug}>
              <h3 className="text-xl">
                <Link href={`/portfolio/${p.slug}`} className="hover:text-teal">
                  {p.title}
                </Link>
              </h3>
              <p className="mt-2 text-muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
