"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Pager } from "@/components/admin/Pager";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { formatDateTime } from "@/lib/admin-lists";
import { listClients, setClientActive, type ClientRow } from "@/lib/admin-api";
import { toApiFailure } from "@/lib/api";

const PAGE_SIZE = 15;

function ClientItem({ client }: { client: ClientRow }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => setClientActive(client.id, !client.isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
    },
  });
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-white p-4 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{client.name}</p>
        <p className="break-words text-muted">
          <a className="underline-offset-4 hover:underline" href={`mailto:${client.email}`}>
            {client.email}
          </a>
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          Joined {formatDateTime(client.createdAt)}
          {client.lastLoginAt ? ` · Last signed in ${formatDateTime(client.lastLoginAt)}` : " · Has not signed in yet"}
        </p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-sm font-medium ${client.isActive ? "bg-teal-tint text-teal-deep" : "bg-panel text-ink-soft"}`}
      >
        {client.isActive ? "Active" : "Deactivated"}
      </span>
      <Button
        variant="secondary"
        disabled={toggle.isPending}
        onClick={() => {
          if (client.isActive && !window.confirm(`Deactivate ${client.name}? They will be signed out and unable to sign in.`)) return;
          toggle.mutate();
        }}
      >
        {client.isActive ? "Deactivate" : "Reactivate"}
      </Button>
      {toggle.isError ? <p className="w-full text-danger">{toApiFailure(toggle.error).message}</p> : null}
    </li>
  );
}

export function ClientList() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "clients", q, page],
    queryFn: () => listClients({ q, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQ(search.trim());
    setPage(1);
  }

  return (
    <div>
      <form onSubmit={submitSearch} className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <TextField
          id="client-search"
          label="Search"
          placeholder="Name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {query.isError ? <Alert tone="error" title={toApiFailure(query.error).message} /> : null}
      {query.isPending ? <Skeleton className="h-20 w-full" /> : null}
      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body={q ? "Nothing matches that search." : "People who create an account on the site will appear here."}
        />
      ) : null}
      {query.data && query.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {query.data.items.map((c) => (
              <ClientItem key={c.id} client={c} />
            ))}
          </ul>
          <Pager page={page} pageSize={PAGE_SIZE} total={query.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
}
