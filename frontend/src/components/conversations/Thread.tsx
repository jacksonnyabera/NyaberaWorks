"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { TextAreaField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import { formatDate, formatDateTime } from "@/lib/admin-lists";
import { toApiFailure } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatKes, type LeadDetail, type Quotation } from "@/lib/conversations-api";

export type Viewer = "CLIENT" | "ADMIN";

const quotationLabel: Record<Quotation["status"], string> = {
  sent: "Waiting for an answer",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Replaced or withdrawn",
};

export function QuotationCard({ quotation, actions }: { quotation: Quotation; actions?: ReactNode }) {
  const open = quotation.status === "sent" && !quotation.expired;
  return (
    <div className={cn("rounded-card border p-4 sm:p-5", open ? "border-teal/50 bg-teal-tint" : "border-line bg-panel")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Quotation</p>
        <p className="text-sm text-muted">
          {quotation.status === "sent" && quotation.expired ? "Expired" : quotationLabel[quotation.status]}
        </p>
      </div>
      <p className="mt-1 text-2xl font-semibold">{formatKes(quotation.amountKes)}</p>
      <p className="mt-3 whitespace-pre-wrap break-words">{quotation.details}</p>
      <p className="mt-3 text-sm text-muted">
        Valid until {formatDate(quotation.validUntil)} · sent {formatDateTime(quotation.createdAt)}
      </p>
      {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

/** The original request, the messages after it, and any quotations. */
export function ThreadView({
  detail,
  viewer,
  quotationActions,
}: {
  detail: LeadDetail;
  viewer: Viewer;
  quotationActions?: (q: Quotation) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      <dl className="rounded-card border border-line bg-panel p-4 sm:p-5">
        <dt className="text-sm font-semibold uppercase tracking-wide text-muted">Original request</dt>
        {detail.summary.map(([label, value]) => (
          <dd key={label} className="mt-2">
            <span className="text-sm text-muted">{label}: </span>
            <span className="whitespace-pre-wrap break-words">{value}</span>
          </dd>
        ))}
      </dl>
      {detail.messages.length === 0 && detail.quotations.length === 0 ? (
        <p className="text-muted">No replies yet.</p>
      ) : null}
      <ol className="space-y-3">
        {detail.messages.map((m) => {
          const mine = m.authorRole === viewer;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-card px-4 py-3",
                  mine ? "bg-teal text-white" : "border border-line bg-white",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-xs", mine ? "text-white/80" : "text-muted")}>
                  {m.authorRole === "ADMIN" ? "NyaberaWorks" : "Client"} · {formatDateTime(m.createdAt)}
                  {mine && viewer === "ADMIN" && m.read ? " · seen" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {detail.quotations.map((q) => (
        <QuotationCard key={q.id} quotation={q} actions={quotationActions?.(q)} />
      ))}
    </div>
  );
}

export function ReplyBox({
  id,
  onSend,
  disabledReason,
  label = "Your reply",
}: {
  id: string;
  onSend: (body: string) => Promise<void>;
  disabledReason?: string;
  label?: string;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(text);
      setBody("");
    } catch (failure) {
      setError(toApiFailure(failure).message);
    } finally {
      setBusy(false);
    }
  }

  if (disabledReason) return <Alert tone="info" title={disabledReason} />;
  return (
    <form onSubmit={submit} className="space-y-3">
      <TextAreaField
        id={id}
        label={label}
        className="min-h-24"
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error ? <Alert tone="error" title={error} /> : null}
      <Button type="submit" disabled={busy || body.trim() === ""}>
        {busy ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}
