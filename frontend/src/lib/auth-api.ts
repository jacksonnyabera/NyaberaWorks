import { api, endpoints } from "@/lib/api";
import { authClient } from "@/lib/auth-session";
import { setAccessToken } from "@/lib/auth-store";
import type { AdminOverview, SessionResponse, TwoFactorSetup, User } from "@/lib/auth-types";

function remember(session: SessionResponse): User {
  setAccessToken(session.accessToken);
  return session.user;
}

export async function registerAccount(values: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<User> {
  const { data } = await authClient.post<SessionResponse>(endpoints.register, {
    ...values,
    phone: values.phone.trim() === "" ? null : values.phone,
  });
  return remember(data);
}

export async function signIn(values: {
  email: string;
  password: string;
  totpCode?: string;
}): Promise<User> {
  const { data } = await authClient.post<SessionResponse>(endpoints.login, {
    email: values.email,
    password: values.password,
    ...(values.totpCode ? { totpCode: values.totpCode.trim() } : {}),
  });
  return remember(data);
}

export async function signOut(): Promise<void> {
  try {
    await authClient.post(endpoints.logout);
  } finally {
    setAccessToken(null);
  }
}

export async function updateProfile(values: { name: string; phone: string }): Promise<User> {
  const { data } = await api.patch<User>(endpoints.me, {
    name: values.name,
    phone: values.phone.trim() === "" ? null : values.phone,
  });
  return data;
}

export async function changePassword(values: {
  currentPassword: string;
  newPassword: string;
}): Promise<User> {
  const { data } = await api.post<SessionResponse>(endpoints.changePassword, values);
  return remember(data);
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>(endpoints.adminOverview);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await authClient.post(endpoints.forgotPassword, { email });
}

export async function resetPassword(values: { token: string; newPassword: string }): Promise<void> {
  await authClient.post(endpoints.resetPassword, values);
}

export async function startTwoFactor(): Promise<TwoFactorSetup> {
  const { data } = await api.post<TwoFactorSetup>(endpoints.twoFactorSetup);
  return data;
}

export async function enableTwoFactor(code: string): Promise<string[]> {
  const { data } = await api.post<{ recoveryCodes: string[] }>(endpoints.twoFactorEnable, { code });
  return data.recoveryCodes;
}

export async function disableTwoFactor(values: { password: string; code: string }): Promise<void> {
  await api.post(endpoints.twoFactorDisable, values);
}
