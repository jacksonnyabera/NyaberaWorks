import Link from "next/link";

import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9 shrink-0", className)} role="img" aria-label="NyaberaWorks mark">
      <rect x="1" y="1" width="38" height="38" rx="12" fill="#4936a8" />
      <path
        d="M10 28V12l10 11V12m0 16 10-16v16"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="28" r="2" fill="#c9c0ff" />
    </svg>
  );
}

export function Logo({ inverse }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label={`${site.name} home`}>
      <LogoMark />
      <span className={cn("font-display text-xl font-bold tracking-[-0.045em]", inverse ? "text-paper" : "text-ink")}>
        Nyabera<span className="text-teal">Works</span>
      </span>
    </Link>
  );
}
