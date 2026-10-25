"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";

/** Shown to visitors who are not signed in: replies and quotations arrive in the account. */
export function GuestNote({ after }: { after?: boolean }) {
  const { status } = useAuth();
  if (status !== "anonymous") return null;
  return (
    <p className="text-sm text-muted">
      {after
        ? "Want our reply and any quotation inside the app? Create an account, then send your next request while signed in. This one was sent without an account, so we will reply by email or phone."
        : "Want our reply inside the app? "}
      {after ? null : (
        <>
          <Link className="underline" href="/register">
            Create an account
          </Link>{" "}
          or{" "}
          <Link className="underline" href="/login">
            log in
          </Link>{" "}
          before sending, and replies and quotations will appear in your account.
        </>
      )}
      {after ? (
        <>
          {" "}
          <Link className="underline" href="/register">
            Create an account
          </Link>
          .
        </>
      ) : null}
    </p>
  );
}
