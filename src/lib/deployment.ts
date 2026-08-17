// The JSON-file storage in storage.ts writes to the local filesystem, which
// doesn't work on Vercel: deployed functions run on a read-only filesystem
// outside /tmp, and /tmp itself is ephemeral and not shared across
// invocations. Vercel sets VERCEL=1 automatically in every deployment (no
// manual env var needed) — use that to disable Save there rather than let it
// fail with a raw filesystem error. Once storage moves to a real database
// (e.g. Vercel Postgres), this gate should come out.
export function isSaveAvailable(): boolean {
  return !process.env.VERCEL;
}

export const SAVE_UNAVAILABLE_MESSAGE =
  "Saving isn't available in this preview deployment yet — persistent storage (e.g. Vercel Postgres) is planned as a follow-up. You can still upload, extract, and review a statement below.";
