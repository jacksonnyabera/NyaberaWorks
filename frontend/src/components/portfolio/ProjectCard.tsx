import Link from "next/link";

import { StatusBadge, Tag } from "@/components/ui/Badge";
import type { Project } from "@/content/projects";

import { ProjectCover } from "./ProjectCover";

function categoryLabel(category: Project["category"]): string {
  return category === "Biomedical" ? "Operations software" : category;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group flex h-full flex-col">
      <Link href={`/portfolio/${project.slug}`} tabIndex={-1} aria-hidden="true">
        <ProjectCover motif={project.motif} className="aspect-[8/5] w-full transition-transform duration-300 group-hover:scale-[1.015]" />
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatusBadge status={project.status} />
        <span className="text-sm text-muted">{categoryLabel(project.category)}</span>
      </div>
      <h3 className="mt-3 text-2xl">
        <Link href={`/portfolio/${project.slug}`} className="hover:text-violet">
          {project.title}
        </Link>
      </h3>
      <p className="mt-2 text-muted">{project.summary}</p>
      {project.technologies.length > 0 ? (
        <ul aria-label="Technologies" className="mt-4 flex flex-wrap gap-2">
          {project.technologies.slice(0, 3).map((technology) => (
            <Tag key={technology}>{technology}</Tag>
          ))}
          {project.technologies.length > 3 ? (
            <li className="self-center text-xs text-muted">+{project.technologies.length - 3} more</li>
          ) : null}
        </ul>
      ) : null}
      <Link
        href={`/portfolio/${project.slug}`}
        className="mt-auto inline-flex items-center gap-2 pt-5 font-semibold text-violet underline-offset-4 hover:underline"
      >
        Explore project <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
