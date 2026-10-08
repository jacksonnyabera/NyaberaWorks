"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/states";
import type { Role } from "@/lib/auth-types";

import { useAuth } from "./AuthProvider";

/**
 * Keeps a page behind sign-in. This is for a good experience only: the real
 * protection is that the API refuses every request without a valid token.
 */
export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { status, user, loggedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "anonymous") return;
    // After choosing to log out, go home. Otherwise ask them to sign in and come back here.
    router.replace(loggedOut ? "/" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [status, loggedOut, router, pathname]);

  if (status !== "authenticated" || !user) {
    return (
      <Container className="py-20">
        <div aria-busy="true" aria-label="Checking your sign-in" className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Container>
    );
  }

  if (role && user.role !== role) {
    return (
      <Container className="py-24">
        <h1 className="text-4xl">You do not have access to this page</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          This area is for administrators. If you think you should have access, contact the site owner.
        </p>
        <div className="mt-8">
          <ButtonLink href="/account">Go to your account</ButtonLink>
        </div>
      </Container>
    );
  }

  return <>{children}</>;
}
