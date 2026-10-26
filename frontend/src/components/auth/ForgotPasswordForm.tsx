"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import type { ApiFailure } from "@/lib/api";
import { forgotPassword } from "@/lib/auth-api";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/auth-schemas";

import { failureToForm } from "./formHelpers";

export function ForgotPasswordForm() {
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFailure(null);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setFailure(failureToForm(error, setError, ["email"]));
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Check your email">
          If an account exists for that address, a reset link is on its way. It works once and expires in 30 minutes.
        </Alert>
        <p className="text-muted">
          <Link className="font-semibold text-teal underline-offset-4 hover:underline" href="/login">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register("email")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-muted">
        <Link className="font-semibold text-teal underline-offset-4 hover:underline" href="/login">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
