import Link from "next/link";

import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0a6f6a" />
      <path
        d="M4 18h6l3-9 5 15 3-6h7"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ inverse }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label={`${site.name} home`}>
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold tracking-tight", inverse ? "text-paper" : "text-ink")}>
        Nyabera<span className="text-teal">Works</span>
      </span>
    </Link>
  );
}
