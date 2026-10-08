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
import { registerSchema, type RegisterValues } from "@/lib/auth-schemas";

import { useAuth } from "./AuthProvider";
import { failureToForm } from "./formHelpers";

export function RegisterForm() {
  const { register: createAccount, status, user } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(next ?? homeFor(user.role));
  }, [status, user, next, router]);

  async function onSubmit(values: RegisterValues) {
    setFailure(null);
    try {
      const created = await createAccount(values);
      router.replace(next ?? homeFor(created.role));
    } catch (error) {
      setFailure(failureToForm(error, setError, ["name", "email", "phone", "password"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField id="register-name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <TextField id="register-email" label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register("email")} />
      <TextField
        id="register-phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        optional
        error={errors.phone?.message}
        {...register("phone")}
      />
      <TextField
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters. A few random words make a strong password."
        error={errors.password?.message}
        {...register("password")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm text-muted">
        By creating an account you agree to the{" "}
        <Link className="underline" href="/terms">
          terms
        </Link>{" "}
        and the{" "}
        <Link className="underline" href="/privacy">
          privacy policy
        </Link>
        .
      </p>
      <p className="text-muted">
        Already have an account?{" "}
        <Link className="font-semibold text-teal underline-offset-4 hover:underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
          Log in
        </Link>
      </p>
    </form>
  );
}
