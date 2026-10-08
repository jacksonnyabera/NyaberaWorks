"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import type { ApiFailure } from "@/lib/api";
import { homeFor, safeNext } from "@/lib/auth-redirect";
import { loginSchema, type LoginValues } from "@/lib/auth-schemas";

import { useAuth } from "./AuthProvider";
import { failureToForm } from "./formHelpers";

export function LoginForm() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Someone who is already signed in has no reason to see this page.
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(next ?? homeFor(user.role));
  }, [status, user, next, router]);

  async function onSubmit(values: LoginValues) {
    setFailure(null);
    try {
      const signedIn = await login(values);
      router.replace(next ?? homeFor(signedIn.role));
    } catch (error) {
      setFailure(failureToForm(error, setError, ["email", "password"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField
        id="login-email"
        label="Email"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Signing in..." : "Log in"}
      </Button>
      <p className="text-muted">
        New here?{" "}
        <Link className="font-semibold text-teal underline-offset-4 hover:underline" href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
