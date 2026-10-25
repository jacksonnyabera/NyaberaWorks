import { api } from "@/lib/api";

export type RequestKind = "contact" | "quote" | "booking";

export type LeadSummary = {
  kind: RequestKind;
  id: string;
  reference: string;
  service: string;
  status: string;
  createdAt: string;
  lastActivityAt: string;
  unread: number;
  openQuotation: boolean;
};

export type ThreadMessage = {
  id: string;
  authorRole: "CLIENT" | "ADMIN";
  body: string;
  createdAt: string;
  read: boolean;
};

export type Quotation = {
  id: string;
  amountKes: number;
  details: string;
  validUntil: string;
  status: "sent" | "accepted" | "declined" | "withdrawn";
  expired: boolean;
  createdAt: string;
  respondedAt: string | null;
};

export type LeadDetail = {
  kind: RequestKind;
  id: string;
  reference: string;
  service: string;
  status: string;
  createdAt: string;
  summary: [string, string][];
  messages: ThreadMessage[];
  quotations: Quotation[];
  canReply: boolean;
};

export const isRequestKind = (value: string): value is RequestKind =>
  value === "contact" || value === "quote" || value === "booking";

/** Admin lists use plural path names; the conversation endpoints use the singular kind. */
export const kindFromAdminPath = (path: "contact-messages" | "quote-requests" | "bookings"): RequestKind =>
  path === "contact-messages" ? "contact" : path === "quote-requests" ? "quote" : "booking";

export function formatKes(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

// ---------- client ----------

export async function listMyRequests(): Promise<LeadSummary[]> {
  return (await api.get<LeadSummary[]>("/v1/me/requests")).data;
}

export async function getUnread(): Promise<number> {
  return (await api.get<{ unread: number }>("/v1/me/unread")).data.unread;
}

export async function getMyRequest(kind: RequestKind, id: string): Promise<LeadDetail> {
  return (await api.get<LeadDetail>(`/v1/me/requests/${kind}/${id}`)).data;
}

export async function sendMyMessage(kind: RequestKind, id: string, body: string): Promise<LeadDetail> {
  return (await api.post<LeadDetail>(`/v1/me/requests/${kind}/${id}/messages`, { body })).data;
}

export async function answerQuotation(id: string, decision: "accept" | "decline"): Promise<LeadDetail> {
  return (await api.post<LeadDetail>(`/v1/me/quotations/${id}/${decision}`)).data;
}

// ---------- admin ----------

export async function getAdminThread(kind: RequestKind, id: string): Promise<LeadDetail> {
  return (await api.get<LeadDetail>(`/v1/admin/requests/${kind}/${id}/thread`)).data;
}

export async function sendAdminMessage(kind: RequestKind, id: string, body: string): Promise<LeadDetail> {
  return (await api.post<LeadDetail>(`/v1/admin/requests/${kind}/${id}/messages`, { body })).data;
}

export type QuotationInput = { amountKes: number; details: string; validUntil: string };

export async function sendQuotation(id: string, input: QuotationInput): Promise<LeadDetail> {
  return (await api.post<LeadDetail>(`/v1/admin/quote-requests/${id}/quotations`, input)).data;
}

export async function withdrawQuotation(id: string): Promise<LeadDetail> {
  return (await api.post<LeadDetail>(`/v1/admin/quotations/${id}/withdraw`)).data;
}
