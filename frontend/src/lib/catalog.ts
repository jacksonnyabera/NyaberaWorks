/**
 * Server-side data layer for services and portfolio projects.
 *
 * The database (through the FastAPI API) is the source of truth. If the API
 * cannot be reached (for example while building without a backend running),
 * the bundled starter content in src/content is used instead, so the public
 * site never goes blank. Pages refresh from the API about every minute.
 *
 * Only call these from server components. The browser never calls them.
 */
import { projects as bundledProjects, type Project } from "@/content/projects";
import { services as bundledServices, type Service } from "@/content/services";

export const REVALIDATE_SECONDS = 60;

const API_BASE = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type Fetched<T> = { ok: true; data: T } | { ok: false; status: number | null };

async function fetchApi<T>(path: string): Promise<Fetched<T>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: null };
  }
}

function isArrayOf<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export async function getServices(): Promise<Service[]> {
  const result = await fetchApi<Service[]>("/services");
  return result.ok && isArrayOf<Service>(result.data) ? result.data : bundledServices;
}

export async function getService(slug: string): Promise<Service | undefined> {
  const result = await fetchApi<Service>(`/services/${encodeURIComponent(slug)}`);
  if (result.ok) return result.data;
  if (result.status === 404) return undefined; // the API answered: it does not exist
  return bundledServices.find((s) => s.slug === slug); // the API is unreachable
}

export async function getProjects(): Promise<Project[]> {
  const result = await fetchApi<Project[]>("/projects");
  return result.ok && isArrayOf<Project>(result.data) ? result.data : bundledProjects;
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const result = await fetchApi<Project>(`/projects/${encodeURIComponent(slug)}`);
  if (result.ok) return result.data;
  if (result.status === 404) return undefined;
  return bundledProjects.find((p) => p.slug === slug);
}

/** What the forms need: just a slug and a name for each service. */
export type ServiceChoice = { slug: string; title: string };

export async function getServiceChoices(): Promise<ServiceChoice[]> {
  return (await getServices()).map(({ slug, title }) => ({ slug, title }));
}
