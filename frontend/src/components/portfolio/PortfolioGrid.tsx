"use client";

import { useMemo, useState } from "react";

import type { Project } from "@/content/projects";
import { ProjectCard } from "@/components/portfolio/ProjectCard";

type Category = Project["category"] | "All";

const categoryLabels: Record<Project["category"], string> = {
  "Web platform": "Web platforms",
  Biomedical: "Operations software",
  "Backend & data": "Data & backend",
  Automation: "Automation",
};

export function PortfolioGrid({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((project) => project.category)))] as Category[],
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesCategory = category === "All" || project.category === category;
      const searchable = [
        project.title,
        project.summary,
        categoryLabels[project.category],
        ...project.technologies,
        ...project.features,
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, projects, query]);

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="portfolio-search" className="mb-2 block text-sm font-semibold">
            Find a project
          </label>
          <input
            id="portfolio-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project, capability or technology"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/20 sm:max-w-md"
          />
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          Showing <span className="font-semibold text-ink">{filteredProjects.length}</span> of{" "}
          <span className="font-semibold text-ink">{projects.length}</span> projects
        </p>
      </div>

      <div className="flex flex-wrap gap-2 py-6" aria-label="Filter projects by category">
        {categories.map((item) => {
          const selected = category === item;
          const label = item === "All" ? "All work" : categoryLabels[item];
          return (
            <button
              key={item}
              type="button"
              aria-pressed={selected}
              onClick={() => setCategory(item)}
              className={
                selected
                  ? "rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-violet hover:text-violet"
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {filteredProjects.length > 0 ? (
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
          <h2 className="text-xl">No matching projects</h2>
          <p className="mt-2 text-muted">Try another search term or clear the category filter.</p>
          <button
            type="button"
            onClick={() => {
              setCategory("All");
              setQuery("");
            }}
            className="mt-5 font-semibold text-violet underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
