"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { getUnread } from "@/lib/conversations-api";

import { useAuth } from "./AuthProvider";

/**
 * "Log in" for visitors, "Account" once signed in. There is deliberately no public
 * link to the admin area: the owner goes to /admin directly (or signs in and is sent there).
 */
export function AccountLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const { status, user } = useAuth();
  const unread = useQuery({
    queryKey: ["me", "unread"],
    queryFn: getUnread,
    enabled: status === "authenticated" && user?.role === "CLIENT",
    staleTime: 0,
    refetchInterval: 60_000,
  });
  if (status === "loading") {
    return <span aria-hidden="true" className={cn("inline-block h-5 w-16", className)} />;
  }
  if (!user) {
    return (
      <Link href="/login" className={cn(linkClassName, className)}>
        Log in
      </Link>
    );
  }
  return (
    <span className={cn("flex items-center gap-6", className)}>
      <Link href="/account" className={linkClassName}>
        Account
        {unread.data ? (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {unread.data} new
          </span>
        ) : null}
      </Link>
    </span>
  );
}
