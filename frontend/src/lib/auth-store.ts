/**
 * The access token lives only in this variable (browser memory). It is never
 * written to localStorage or a readable cookie, so a script injected into the
 * page cannot read it from storage. A reload simply asks the server for a new
 * one using the httpOnly refresh cookie.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
