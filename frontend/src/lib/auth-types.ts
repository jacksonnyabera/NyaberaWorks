export type Role = "CLIENT" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  totpEnabled: boolean;
  createdAt: string;
};

export type SessionResponse = {
  accessToken: string;
  tokenType: "bearer";
  expiresIn: number;
  user: User;
};

export type TwoFactorSetup = {
  secret: string;
  otpauthUri: string;
};

export type AdminOverview = {
  newContactMessages: number;
  newQuoteRequests: number;
  pendingBookings: number;
  clients: number;
};
