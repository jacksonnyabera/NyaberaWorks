import { api, endpoints } from "@/lib/api";
import { authClient } from "@/lib/auth-session";
import { setAccessToken } from "@/lib/auth-store";
import type { AdminOverview, SessionResponse, User } from "@/lib/auth-types";

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

export async function signIn(values: { email: string; password: string }): Promise<User> {
  const { data } = await authClient.post<SessionResponse>(endpoints.login, values);
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
