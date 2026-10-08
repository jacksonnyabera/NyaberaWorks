"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";

import { useAuth } from "./AuthProvider";

/** "Log in" for visitors, "Account" (and "Admin") once signed in. Used in the header. */
export function AccountLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const { status, user } = useAuth();
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
      {user.role === "ADMIN" ? (
        <Link href="/admin" className={linkClassName}>
          Admin
        </Link>
      ) : null}
      <Link href="/account" className={linkClassName}>
        Account
      </Link>
    </span>
  );
}
