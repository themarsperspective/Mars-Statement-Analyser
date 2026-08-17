import Link from "next/link";
import { notFound } from "next/navigation";
import { getStatementById } from "@/lib/storage";
import SummaryCard from "@/components/SummaryCard";
import PartnerRanking from "@/components/PartnerRanking";
import AccentDetails from "@/components/AccentDetails";
import { SECTION_ACCENTS } from "@/lib/sectionAccents";

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

export default async function StatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const statement = await getStatementById(id);
  if (!statement) notFound();

  const { data } = statement;
  const totalActualCharges = Math.abs(data.actualCharges.reduce((sum, f) => sum + (f.amount ?? 0), 0));

  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-8 py-12 sm:py-14 flex flex-col gap-10">
      <div>
        <Link
          href="/statements"
          className="text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          ← All Statements
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mt-3">
          {data.merchantName || "Unnamed Statement"}
        </h1>
        <p className="text-sm text-neutral-500 mt-1.5">
          {statement.sourceFileName} · Saved {fmtDate(statement.savedAt)}
        </p>
      </div>

      <SummaryCard data={data} totalActualCharges={totalActualCharges} />

      <AccentDetails accent="amber" title="Full breakdown">
        <div className="flex flex-col gap-9">
          <section className={SECTION_ACCENTS.sky.wrapper}>
            <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.sky.label} mb-3`}>
              Additional Details
            </h2>
            <div className="border border-neutral-200 divide-y divide-neutral-200 bg-white text-sm">
              <div className="grid grid-cols-2 px-4 py-2.5 gap-4">
                <span className="text-neutral-600">Merchant Category Code (MCC)</span>
                <span className="text-neutral-900">{data.mcc}</span>
              </div>
              <div className="grid grid-cols-2 px-4 py-2.5 gap-4">
                <span className="text-neutral-600">Total Transaction Count</span>
                <span className="text-neutral-900 tabular-nums">{fmtNumber(data.transactionCount)}</span>
              </div>
              <div className="grid grid-cols-2 px-4 py-2.5 gap-4">
                <span className="text-neutral-600">Average Transaction Value</span>
                <span className="text-neutral-900 tabular-nums">
                  £{fmtNumber(data.averageTransactionValue)}
                </span>
              </div>
            </div>
          </section>

          <section className={SECTION_ACCENTS.violet.wrapper}>
            <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.violet.label} mb-1`}>
              Scheme Rates (stated)
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Scheme-by-scheme rates stated on the statement, where given.
            </p>
            <div className="border border-neutral-200 bg-white text-sm">
              {data.schemeRates.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No scheme-level rates stated.</p>
              )}
              {data.schemeRates.map((sr, i) => (
                <div
                  key={i}
                  className="flex justify-between px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                >
                  <span className="text-neutral-700">{sr.scheme || "—"}</span>
                  <span className="text-neutral-900 tabular-nums">
                    {sr.ratePercent !== null ? `${sr.ratePercent}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={SECTION_ACCENTS.orange.wrapper}>
            <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.orange.label} mb-1`}>
              Rate Card
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Contracted rates the merchant is set up to pay per transaction type — not amounts actually
              charged this period.
            </p>
            <div className="border border-neutral-200 bg-white text-sm">
              {data.rateCard.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No rate card detected.</p>
              )}
              {data.rateCard.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                >
                  <span className="text-neutral-700">{item.label || "—"}</span>
                  <span className="text-neutral-900 text-right tabular-nums">{item.rate || "—"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={SECTION_ACCENTS.rose.wrapper}>
            <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.rose.label} mb-1`}>
              Actual Charges This Period
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Itemised amounts actually deducted this statement period.
            </p>
            <div className="border border-neutral-200 bg-white text-sm">
              {data.actualCharges.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No fee line items detected.</p>
              )}
              {data.actualCharges.map((fee, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                >
                  <span className="text-neutral-700">{fee.label || "—"}</span>
                  <span className="text-neutral-900 tabular-nums">{fmtNumber(fee.amount)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={SECTION_ACCENTS.slate.wrapper}>
            <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.slate.label} mb-1`}>
              Other Adjustments
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Rejected/resubmitted deposits, refunds, chargebacks. Not counted as fees or in the blended
              rate.
            </p>
            <div className="border border-neutral-200 bg-white text-sm">
              {data.otherAdjustments.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No adjustments detected.</p>
              )}
              {data.otherAdjustments.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                >
                  <span className="text-neutral-700">{item.label || "—"}</span>
                  <span className="text-neutral-900 tabular-nums">{fmtNumber(item.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AccentDetails>

      <AccentDetails accent="teal" title="Partner Comparison (Internal)">
        <PartnerRanking data={data} />
      </AccentDetails>
    </div>
  );
}
