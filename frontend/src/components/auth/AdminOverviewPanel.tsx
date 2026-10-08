"use client";

import { useQuery } from "@tanstack/react-query";

import { Providers } from "@/components/providers";
import { Alert, Skeleton } from "@/components/ui/states";
import { toApiFailure } from "@/lib/api";
import { fetchAdminOverview } from "@/lib/auth-api";

const cards = [
  { key: "newContactMessages", label: "New messages" },
  { key: "newQuoteRequests", label: "New quote requests" },
  { key: "pendingBookings", label: "Bookings to confirm" },
  { key: "clients", label: "Client accounts" },
] as const;

function Overview() {
  const { data, error, isPending } = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchAdminOverview });

  if (error) return <Alert tone="error" title={toApiFailure(error).message} />;
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.key} className="rounded-card border border-line bg-white p-5">
          <dt className="text-sm text-muted">{card.label}</dt>
          <dd className="mt-2 font-display text-4xl font-semibold">
            {isPending ? <Skeleton className="h-10 w-16" /> : data[card.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminOverviewPanel() {
  return (
    <Providers>
      <Overview />
    </Providers>
  );
}
