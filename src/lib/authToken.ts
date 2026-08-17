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
