export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/statements";
  const hasError = params.error === "1";

  return (
    <div className="mx-auto max-w-sm px-6 sm:px-8 py-20 sm:py-28">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        Saved Statements
      </p>
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight mb-1.5">Password required</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Enter the password to view saved statements and the partner comparison.
      </p>

      {hasError && (
        <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 mb-4">
          Incorrect password. Please try again.
        </p>
      )}

      <form method="POST" action="/api/auth/login" className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoFocus
          className="bg-white border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
        />
        <button
          type="submit"
          className="bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-neutral-800 transition-colors"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
