import { cn } from "@/lib/cn";
import type { ProjectStatus } from "@/content/projects";

const styles: Record<ProjectStatus, string> = {
  Live: "bg-teal-tint text-teal-deep",
  "In development": "bg-amber-100 text-amber-900",
  Built: "bg-panel text-ink-soft",
  Prototype: "bg-panel text-ink-soft",
  "Learning project": "bg-panel text-ink-soft",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        styles[status],
      )}
    >
      {status === "Live" ? <span className="h-2 w-2 rounded-full bg-teal" aria-hidden="true" /> : null}
      {status}
    </span>
  );
}

export function Tag({ children }: { children: string }) {
  return (
    <li className="rounded-md border border-line bg-paper px-2.5 py-1 text-sm text-ink-soft">{children}</li>
  );
}
