"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Pager } from "@/components/admin/Pager";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { formatDateTime } from "@/lib/admin-lists";
import { listCatalog, listLeads, updateLead, type LeadBase, type LeadKind } from "@/lib/admin-api";
import { toApiFailure } from "@/lib/api";
import { cn } from "@/lib/cn";

export type LeadConfig<T extends LeadBase> = {
  kind: LeadKind;
  noun: string; // "message", "quote request"
  statuses: readonly string[];
  /** Label/value pairs shown when a row is opened, after the contact details. */
  details: (row: T) => [string, string][];
};

const PAGE_SIZE = 15;
const attention = new Set(["new", "requested"]);

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium capitalize",
        attention.has(status) ? "bg-amber-100 text-amber-900" : "bg-panel text-ink-soft",
      )}
    >
      {status}
    </span>
  );
}

function LeadRow<T extends LeadBase>({
  row,
  config,
  serviceName,
}: {
  row: T;
  config: LeadConfig<T>;
  serviceName: string;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(row.status);
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const save = useMutation({
    mutationFn: () => updateLead<T>(config.kind, row.id, { status, adminNotes: notes }),
    onSuccess: (updated) => {
      setStatus(updated.status);
      setNotes(updated.adminNotes ?? "");
      void queryClient.invalidateQueries({ queryKey: ["admin", config.kind] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
  const dirty = status !== row.status || notes !== (row.adminNotes ?? "");
  const rows: [string, string][] = [
    ["Name", row.name],
    ["Email", row.email],
    ...(row.phone ? ([["Phone", row.phone]] as [string, string][]) : []),
    ["Service", serviceName],
    ...config.details(row),
  ];

  return (
    <li className="rounded-card border border-line bg-white">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:px-5">
          <span className="font-mono text-sm text-muted">{row.reference}</span>
          <span className="font-semibold">{row.name}</span>
          <span className="text-muted">{serviceName}</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted">{formatDateTime(row.createdAt)}</span>
            <StatusPill status={row.status} />
          </span>
        </summary>
        <div className="border-t border-line p-4 sm:p-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className={cn(value.length > 80 || value.includes("\n") ? "sm:col-span-2" : "")}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words">
                  {label === "Email" ? (
                    <a className="underline underline-offset-4" href={`mailto:${value}`}>
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-4 sm:grid-cols-[14rem_1fr]">
            <SelectField
              id={`status-${row.id}`}
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {config.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              id={`notes-${row.id}`}
              label="Your notes"
              hint="Only you can see these."
              className="min-h-24"
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            {save.isSuccess && !dirty ? <span className="text-teal-deep">Saved.</span> : null}
            {save.isError ? <span className="text-danger">{toApiFailure(save.error).message}</span> : null}
          </div>
        </div>
      </details>
    </li>
  );
}

export function LeadList<T extends LeadBase>({ config }: { config: LeadConfig<T> }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const catalog = useQuery({
    queryKey: ["admin", "services"],
    queryFn: () => listCatalog<{ slug: string; title: string }>("services"),
  });
  const titles = new Map((catalog.data ?? []).map((s) => [s.slug, s.title]));
  const serviceName = (slug: string) => (slug === "other" ? "Something else" : (titles.get(slug) ?? slug));
  const query = useQuery({
    queryKey: ["admin", config.kind, status, q, page],
    queryFn: () => listLeads<T>(config.kind, { status, q, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQ(search.trim());
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
        <SelectField
          id="filter-status"
          label="Show"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {config.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <form onSubmit={submitSearch} className="contents">
          <TextField
            id="filter-search"
            label="Search"
            placeholder="Name, email or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {query.isError ? <Alert tone="error" title={toApiFailure(query.error).message} /> : null}
      {query.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title={`No ${config.noun}s here`}
          body={status || q ? "Nothing matches these filters." : `New ${config.noun}s from the website will appear here.`}
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {query.data.items.map((row) => (
              <LeadRow key={row.id} row={row} config={config} serviceName={serviceName(row.service)} />
            ))}
          </ul>
          <Pager page={page} pageSize={PAGE_SIZE} total={query.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
}
