"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/forms/fields";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import type { ApiFailure } from "@/lib/api";
import { resetPassword } from "@/lib/auth-api";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/auth-schemas";

import { failureToForm } from "./formHelpers";

/** The link carries its token after the "#", so it is never sent to a server or written to a log. */
export function tokenFromHash(hash: string): string | null {
  const match = /(?:^#|&)token=([A-Za-z0-9_-]{20,200})(?:&|$)/.exec(hash);
  return match ? match[1] : null;
}

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    // The fragment only exists in the browser, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(tokenFromHash(window.location.hash));
    // Keep the secret out of the address bar, history and screenshots once it has been read.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) return;
    setFailure(null);
    try {
      await resetPassword({ token, newPassword: values.newPassword });
      setDone(true);
    } catch (error) {
      setFailure(failureToForm(error, setError, ["newPassword"]));
    }
  }

  if (token === undefined) return null;

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Password changed">
          You were signed out everywhere. Log in with your new password.
        </Alert>
        <ButtonLink href="/login">Log in</ButtonLink>
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="space-y-5">
        <Alert tone="error" title="This reset link is not complete">
          Open the link from your email again, or request a new one.
        </Alert>
        <p className="text-muted">
          <Link className="font-semibold text-teal underline-offset-4 hover:underline" href="/forgot-password">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField
        id="reset-new"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <TextField
        id="reset-confirm"
        label="Repeat new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {failure ? (
        <Alert tone="error" title={failure.message}>
          {failure.code === "INVALID_RESET_LINK" ? (
            <Link className="underline" href="/forgot-password">
              Request a new link
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Saving..." : "Set new password"}
      </Button>
    </form>
  );
}
