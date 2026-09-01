// Session-cookie value is a derived token, not the raw password — computed
// with Web Crypto so the same code runs in both the Edge middleware and the
// Node.js login route handler. Recomputing this from the current
// STATEMENTS_PASSWORD env var (rather than storing a fixed secret) means
// rotating the password immediately invalidates every existing cookie.
export const AUTH_COOKIE_NAME = "statements_auth";

export async function computeAuthToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`mars-statement-analyser:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Shared by proxy.ts (gating /statements) and "/" (gating just the internal Partner
 * Comparison panel on the otherwise-open New Analysis page) — same cookie, same check. */
export async function isAuthedToken(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.STATEMENTS_PASSWORD;
  if (!password || !cookieValue) return false;
  const expected = await computeAuthToken(password);
  return cookieValue === expected;
}
