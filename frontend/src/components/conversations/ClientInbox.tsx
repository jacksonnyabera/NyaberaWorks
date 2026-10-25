"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import { formatDateTime } from "@/lib/admin-lists";
import { toApiFailure } from "@/lib/api";
import { listMyRequests, type RequestKind } from "@/lib/conversations-api";

const kindName: Record<RequestKind, string> = { contact: "Message", quote: "Quote request", booking: "Booking" };

export function ClientInbox() {
  const query = useQuery({ queryKey: ["me", "requests"], queryFn: listMyRequests, staleTime: 0 });

  if (query.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (query.isError) return <Alert tone="error" title={toApiFailure(query.error).message} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No requests yet"
        body="Requests you send while signed in appear here, with our replies and any quotation."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link
            href={`/account/requests/${item.kind}/${item.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-white p-4 transition-colors hover:border-teal"
          >
            <span className="font-semibold">{kindName[item.kind]}</span>
            <span className="font-mono text-sm text-muted">{item.reference}</span>
            <span className="text-sm capitalize text-muted">{item.status}</span>
            <span className="ml-auto flex items-center gap-3 text-sm text-muted">
              {item.openQuotation ? (
                <span className="rounded-full bg-teal-tint px-3 py-1 font-medium text-teal-deep">Quotation to review</span>
              ) : null}
              {item.unread > 0 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
                  {item.unread} new {item.unread === 1 ? "reply" : "replies"}
                </span>
              ) : null}
              {formatDateTime(item.lastActivityAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
