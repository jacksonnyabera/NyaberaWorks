"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/forms/fields";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import type { ApiFailure } from "@/lib/api";
import { changePassword, updateProfile } from "@/lib/auth-api";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/auth-schemas";
import type { User } from "@/lib/auth-types";

import { useAuth } from "./AuthProvider";
import { TwoFactorPanel } from "./TwoFactorPanel";
import { failureToForm } from "./formHelpers";

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
  });

  async function onSubmit(values: ProfileValues) {
    setFailure(null);
    setSaved(false);
    try {
      setUser(await updateProfile(values));
      setSaved(true);
    } catch (error) {
      setFailure(failureToForm(error, setError, ["name", "phone"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField id="profile-email" label="Email" value={user.email} readOnly hint="Your email is your sign-in name and cannot be changed here." />
      <TextField id="profile-name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <TextField id="profile-phone" label="Phone" type="tel" autoComplete="tel" optional error={errors.phone?.message} {...register("phone")} />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      {saved ? <Alert tone="success" title="Details saved" /> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save details"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [changed, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFailure(null);
    setChanged(false);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      setChanged(true);
    } catch (error) {
      setFailure(failureToForm(error, setError, ["currentPassword", "newPassword"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField
        id="pw-current"
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <TextField
        id="pw-new"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <TextField
        id="pw-confirm"
        label="Repeat new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      {changed ? (
        <Alert tone="success" title="Password changed">
          You were signed out on your other devices.
        </Alert>
      ) : null}
      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}

export function AccountPanel({ user }: { user: User }) {
  const { logout } = useAuth();

  // The page guard (RequireAuth) sends the visitor to the homepage once they are logged out.
  async function onLogout() {
    await logout();
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
      <div className="space-y-14">
        <section aria-labelledby="details-title">
          <h2 id="details-title" className="text-2xl">
            Your details
          </h2>
          <div className="mt-6">
            <ProfileForm user={user} />
          </div>
        </section>
        <section aria-labelledby="password-title">
          <h2 id="password-title" className="text-2xl">
            Password
          </h2>
          <div className="mt-6">
            <PasswordForm />
          </div>
        </section>
        {user.role === "ADMIN" ? (
          <section aria-labelledby="twofactor-title">
            <h2 id="twofactor-title" className="text-2xl">
              Two-factor sign-in
            </h2>
            <div className="mt-6">
              <TwoFactorPanel user={user} />
            </div>
          </section>
        ) : null}
      </div>
      <aside aria-label="Next steps" className="space-y-6">
        <div className="rounded-card border border-line bg-white p-6">
          <h2 className="text-xl">Start something</h2>
          <p className="mt-2 text-muted">Request a written quote or book a time to talk.</p>
          <div className="mt-5 flex flex-col gap-3">
            <ButtonLink href="/quote">Request a quote</ButtonLink>
            <ButtonLink href="/book" variant="secondary">
              Book a service
            </ButtonLink>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onLogout}>
          Log out
        </Button>
      </aside>
    </div>
  );
}
