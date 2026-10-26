"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/states";
import { toApiFailure, type ApiFailure } from "@/lib/api";
import { disableTwoFactor, enableTwoFactor, startTwoFactor } from "@/lib/auth-api";
import {
  disableTwoFactorSchema,
  enableTwoFactorSchema,
  type DisableTwoFactorValues,
  type EnableTwoFactorValues,
} from "@/lib/auth-schemas";
import type { TwoFactorSetup, User } from "@/lib/auth-types";

import { useAuth } from "./AuthProvider";
import { failureToForm } from "./formHelpers";

function EnableForm({ setup, onDone }: { setup: TwoFactorSetup; onDone: (codes: string[]) => void }) {
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnableTwoFactorValues>({
    resolver: zodResolver(enableTwoFactorSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: EnableTwoFactorValues) {
    setFailure(null);
    try {
      onDone(await enableTwoFactor(values.code));
    } catch (error) {
      setFailure(failureToForm(error, setError, ["code"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-muted">
        In your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password) choose &quot;enter a
        setup key&quot; and type this key. Choose time-based.
      </p>
      <p className="break-all rounded-card border border-line bg-white p-4 font-mono text-lg tracking-wider" data-testid="totp-secret">
        {setup.secret}
      </p>
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">Setup link for password managers</summary>
        <p className="mt-2 break-all font-mono">{setup.otpauthUri}</p>
      </details>
      <TextField
        id="totp-enable-code"
        label="6-digit code from the app"
        inputMode="numeric"
        autoComplete="one-time-code"
        error={errors.code?.message}
        {...register("code")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Checking..." : "Turn on two-factor"}
      </Button>
    </form>
  );
}

function DisableForm({ onDone }: { onDone: () => void }) {
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DisableTwoFactorValues>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: { password: "", code: "" },
  });

  async function onSubmit(values: DisableTwoFactorValues) {
    setFailure(null);
    try {
      await disableTwoFactor(values);
      onDone();
    } catch (error) {
      setFailure(failureToForm(error, setError, ["password", "code"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <TextField
        id="totp-off-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        id="totp-off-code"
        label="Authenticator or recovery code"
        autoComplete="one-time-code"
        error={errors.code?.message}
        {...register("code")}
      />
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Turning off..." : "Turn off two-factor"}
      </Button>
    </form>
  );
}

/** Admin accounts only. Clients never see this. */
export function TwoFactorPanel({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setFailure(null);
    setBusy(true);
    try {
      setSetup(await startTwoFactor());
    } catch (error) {
      setFailure(toApiFailure(error));
    } finally {
      setBusy(false);
    }
  }

  if (recovery) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Two-factor is on">
          Save these recovery codes somewhere safe, such as a password manager. Each works once, and they are shown only now.
        </Alert>
        <ul className="grid grid-cols-2 gap-2 rounded-card border border-line bg-white p-4 font-mono" data-testid="recovery-codes">
          {recovery.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <Button type="button" variant="secondary" onClick={() => setRecovery(null)}>
          I have saved them
        </Button>
      </div>
    );
  }

  if (user.totpEnabled) {
    return (
      <div className="space-y-5">
        <p className="text-muted">Two-factor sign-in is on for this account.</p>
        <DisableForm onDone={() => setUser({ ...user, totpEnabled: false })} />
      </div>
    );
  }

  if (setup) {
    return (
      <EnableForm
        setup={setup}
        onDone={(codes) => {
          setRecovery(codes);
          setSetup(null);
          setUser({ ...user, totpEnabled: true });
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="info" title="Two-factor is off">
        Your password is the only thing protecting the admin area. Turn on two-factor so a stolen password is not enough.
      </Alert>
      {failure ? <Alert tone="error" title={failure.message} /> : null}
      <Button type="button" onClick={begin} disabled={busy}>
        {busy ? "Preparing..." : "Set up two-factor"}
      </Button>
    </div>
  );
}
