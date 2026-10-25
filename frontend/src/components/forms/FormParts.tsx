import Link from "next/link";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/states";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/states";
import type { ApiFailure } from "@/lib/api";
import { site } from "@/lib/site";

import { GuestNote } from "./GuestNote";

export function ServerError({ failure }: { failure: ApiFailure }) {
  return (
    <Alert tone="error" title={failure.message}>
      <p>
        If it keeps happening, email{" "}
        <a className="underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        .{failure.requestId ? ` Mention reference ${failure.requestId}.` : ""}
      </p>
    </Alert>
  );
}

export function SubmitSuccess({
  title,
  children,
  reference,
  onReset,
  resetLabel,
}: {
  title: string;
  children: ReactNode;
  reference?: string;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div className="rounded-card border border-teal/40 bg-teal-tint p-6 sm:p-8" role="status">
      <h2 className="text-2xl text-teal-deep">{title}</h2>
      <div className="mt-3 space-y-2 text-ink">{children}</div>
      {reference ? (
        <p className="mt-4 text-sm text-teal-deep">
          Reference: <span className="font-semibold">{reference}</span>
        </p>
      ) : null}
      <div className="mt-4">
        <GuestNote after />
      </div>
      <Button type="button" variant="secondary" className="mt-6" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-36" />
      <Skeleton className="h-12 w-40" />
    </div>
  );
}

export function PrivacyNote() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Your details are used only to reply to this request. See the{" "}
        <Link className="underline" href="/privacy">
          privacy policy
        </Link>
        .
      </p>
      <GuestNote />
    </div>
  );
}
