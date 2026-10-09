import { api } from "@/lib/api";

const base = "/v1/admin";

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type LeadBase = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ContactMessageRow = LeadBase & { message: string };
export type QuoteRequestRow = LeadBase & { budget: string; deadline: string | null; description: string };
export type BookingRow = LeadBase & { preferredDate: string; preferredTime: string; requirements: string };
export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type LeadKind = "contact-messages" | "quote-requests" | "bookings";

export type ListParams = { status?: string; q?: string; page?: number; pageSize?: number };

function clean(params: ListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
}

export async function listLeads<T extends LeadBase>(kind: LeadKind, params: ListParams): Promise<Page<T>> {
  const { data } = await api.get<Page<T>>(`${base}/${kind}`, { params: clean(params) });
  return data;
}

export async function updateLead<T extends LeadBase>(
  kind: LeadKind,
  id: string,
  changes: { status?: string; adminNotes?: string },
): Promise<T> {
  const { data } = await api.patch<T>(`${base}/${kind}/${id}`, changes);
  return data;
}

export async function listClients(params: ListParams): Promise<Page<ClientRow>> {
  const { data } = await api.get<Page<ClientRow>>(`${base}/clients`, { params: clean(params) });
  return data;
}

export async function setClientActive(id: string, isActive: boolean): Promise<ClientRow> {
  const { data } = await api.patch<ClientRow>(`${base}/clients/${id}`, { isActive });
  return data;
}

// ---------- services and projects ----------

export type AdminService = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  problem: string;
  deliverables: string[];
  technologies: string[];
  timeline: string;
  startingPriceKes: number | null;
  bestFor: string;
  note: string | null;
  isActive: boolean;
  sortOrder: number;
};

export const projectCategories = ["Web platform", "Biomedical", "Backend & data", "Automation"] as const;
export const projectStatuses = ["Live", "In development", "Built", "Prototype", "Learning project"] as const;
export const projectMotifs = ["listings", "platform", "board", "ledger", "signal", "pipeline"] as const;

export type AdminProject = {
  id: string;
  slug: string;
  title: string;
  category: (typeof projectCategories)[number];
  status: (typeof projectStatuses)[number];
  summary: string;
  problem: string;
  solution: string;
  features: string[];
  technologies: string[];
  result: string;
  liveUrl: string | null;
  featured: boolean;
  motif: (typeof projectMotifs)[number];
  caveat: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogKind = "services" | "projects";

export async function listCatalog<T>(kind: CatalogKind): Promise<T[]> {
  const { data } = await api.get<T[]>(`${base}/${kind}`);
  return data;
}

export async function saveCatalogItem<T>(
  kind: CatalogKind,
  body: Record<string, unknown>,
  existingSlug: string | null,
): Promise<T> {
  if (existingSlug) {
    const { slug: _ignored, ...rest } = body;
    void _ignored;
    const { data } = await api.put<T>(`${base}/${kind}/${existingSlug}`, rest);
    return data;
  }
  const { data } = await api.post<T>(`${base}/${kind}`, body);
  return data;
}
