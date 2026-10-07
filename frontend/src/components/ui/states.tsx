import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Alert({
  tone,
  title,
  children,
  className,
}: {
  tone: "error" | "success" | "info";
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    error: "border-danger/40 bg-danger-tint text-danger",
    success: "border-teal/40 bg-teal-tint text-teal-deep",
    info: "border-line bg-panel text-ink",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-card border p-4", styles[tone], className)}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-[0.95rem]">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-panel", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-panel/60 p-10 text-center">
      <h3 className="text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
