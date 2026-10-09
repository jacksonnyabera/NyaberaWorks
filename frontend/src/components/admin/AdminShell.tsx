"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Providers } from "@/components/providers";
import { Container } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/portfolio", label: "Portfolio" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAuth role="ADMIN">
      <Providers>
        <div className="border-b border-line bg-paper">
          <Container>
            <p className="pt-10 text-sm font-semibold uppercase tracking-wide text-teal">Admin</p>
            <nav aria-label="Admin sections" className="-mb-px mt-4 flex gap-1 overflow-x-auto">
              {sections.map((s) => {
                const active = s.href === "/admin" ? pathname === "/admin" : pathname.startsWith(s.href);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap border-b-2 px-4 py-3 font-semibold transition-colors",
                      active ? "border-teal text-teal-deep" : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </nav>
          </Container>
        </div>
        <Container className="py-10 sm:py-14">{children}</Container>
      </Providers>
    </RequireAuth>
  );
}

export function AdminHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 text-lg text-muted">{intro}</p> : null}
    </div>
  );
}
