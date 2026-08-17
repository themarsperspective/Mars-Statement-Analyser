import Link from "next/link";
import { listStatements } from "@/lib/storage";
import { isSaveAvailable, SAVE_UNAVAILABLE_MESSAGE } from "@/lib/deployment";

export const dynamic = "force-dynamic";

function fmtNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StatementsPage() {
  const statements = await listStatements();

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-8 py-12 sm:py-14 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">All Statements</h1>
        <p className="text-sm text-neutral-500 mt-1.5">
          {statements.length === 0
            ? "No statements analysed yet."
            : `${statements.length} statement${statements.length === 1 ? "" : "s"} analysed.`}
        </p>
      </div>

      {!isSaveAvailable() && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          {SAVE_UNAVAILABLE_MESSAGE}
        </p>
      )}

      {statements.length === 0 ? (
        <div className="border border-dashed border-neutral-300 px-6 py-16 text-center">
          <p className="text-sm text-neutral-400">
            Nothing here yet.{" "}
            <Link href="/" className="text-neutral-700 underline underline-offset-2">
              Analyse a statement
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-200">
                <th className="px-4 py-3 font-semibold">Merchant</th>
                <th className="px-4 py-3 font-semibold">Acquirer</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold text-right">Turnover</th>
                <th className="px-4 py-3 font-semibold text-right">Transactions</th>
                <th className="px-4 py-3 font-semibold text-right">Avg. Value</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {statements.map((s) => (
                <tr key={s.id} className="align-top hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/statements/${s.id}`}
                      className="font-medium text-neutral-900 hover:underline underline-offset-2"
                    >
                      {s.data.merchantName || "—"}
                    </Link>
                    <div className="text-xs text-neutral-400 mt-0.5">{s.sourceFileName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-neutral-700">{s.data.acquirerName || "—"}</td>
                  <td className="px-4 py-3.5 text-neutral-700">{s.data.statementPeriod || "—"}</td>
                  <td className="px-4 py-3.5 text-right text-neutral-900 tabular-nums">
                    {fmtNumber(s.data.totalTurnover)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-neutral-900 tabular-nums">
                    {fmtNumber(s.data.transactionCount)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-neutral-900 tabular-nums">
                    {fmtNumber(s.data.averageTransactionValue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-neutral-900 tabular-nums">
                    {s.data.blendedRate.value !== null ? (
                      <>
                        {fmtNumber(s.data.blendedRate.value)}%
                        <div className="text-xs text-neutral-400 font-normal">
                          {s.data.blendedRate.source === "stated" ? "Stated" : "Calculated"}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-400">{fmtDate(s.savedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
