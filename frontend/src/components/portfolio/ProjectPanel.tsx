import Link from "next/link";

import { StatusBadge } from "@/components/ui/Badge";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";

import { ProjectCover } from "./ProjectCover";

export function ProjectPanel({ project, flip }: { project: Project; flip?: boolean }) {
  return (
    <article className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <Link
        href={`/portfolio/${project.slug}`}
        className={cn("block", flip && "md:order-2")}
        aria-label={`View ${project.title} case study`}
        tabIndex={-1}
      >
        <ProjectCover motif={project.motif} className="aspect-[8/5] w-full" />
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          <span className="text-sm text-muted">{project.category}</span>
        </div>
        <h3 className="mt-4 text-3xl sm:text-4xl">
          <Link href={`/portfolio/${project.slug}`} className="hover:text-teal">
            {project.title}
          </Link>
        </h3>
        <p className="mt-3 max-w-prose text-lg text-muted">{project.summary}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href={`/portfolio/${project.slug}`} className="font-semibold text-teal underline-offset-4 hover:underline">
            Read the case study
          </Link>
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              Visit the live site
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
