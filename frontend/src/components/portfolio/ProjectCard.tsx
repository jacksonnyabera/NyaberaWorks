import Link from "next/link";

import { StatusBadge } from "@/components/ui/Badge";
import type { Project } from "@/content/projects";

import { ProjectCover } from "./ProjectCover";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group flex h-full flex-col">
      <Link href={`/portfolio/${project.slug}`} tabIndex={-1} aria-hidden="true">
        <ProjectCover motif={project.motif} className="aspect-[8/5] w-full" />
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatusBadge status={project.status} />
        <span className="text-sm text-muted">{project.category}</span>
      </div>
      <h3 className="mt-3 text-2xl">
        <Link href={`/portfolio/${project.slug}`} className="hover:text-teal">
          {project.title}
        </Link>
      </h3>
      <p className="mt-2 text-muted">{project.summary}</p>
      <Link
        href={`/portfolio/${project.slug}`}
        className="mt-auto pt-4 font-semibold text-teal underline-offset-4 hover:underline"
      >
        Read the case study
      </Link>
    </article>
  );
}
