import { PartnerEstimate, RankingSummary } from "@/lib/types";

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface RankedEntry {
  estimate: PartnerEstimate;
  /** True when this entry is an indicative backfill, not a calculated result — must be labeled, never presented as definitive. */
  worthQuoting: boolean;
}

/**
 * Calculated providers first (sorted by cost), indicative only backfilled if
 * fewer than 3 calculated options exist. A low indicative "from" rate never
 * outranks a reliably calculated provider — the two pools are ranked
 * separately, never merged and re-sorted together by raw cost.
 */
function rankBestForMerchant(estimates: PartnerEstimate[]): RankedEntry[] {
  const withCost = estimates.filter((e) => e.estimatedCost !== null);
  const byCost = (a: PartnerEstimate, b: PartnerEstimate) => (a.estimatedCost ?? 0) - (b.estimatedCost ?? 0);
  const calculated = withCost.filter((e) => e.pricingStatus === "calculated").sort(byCost);
  const indicative = withCost.filter((e) => e.pricingStatus === "indicative").sort(byCost);

  const result: RankedEntry[] = calculated.map((estimate) => ({ estimate, worthQuoting: false }));
  if (result.length < 3) {
    const need = 3 - result.length;
    indicative.slice(0, need).forEach((estimate) => result.push({ estimate, worthQuoting: true }));
  }
  return result.slice(0, 3);
}

function savingFor(
  currentCost: number | null,
  estimate: PartnerEstimate,
  annualise: boolean
): { label: string; amount: number; annual: number | null } | null {
  if (estimate.pricingStatus === "unavailable" || currentCost === null || estimate.estimatedCost === null) return null;
  const amount = currentCost - estimate.estimatedCost;
  if (amount <= 0) return null;
  const label = estimate.pricingStatus === "calculated" ? "Estimated Saving" : "Indicative Saving";
  return { label, amount, annual: annualise ? Math.round(amount * 12 * 100) / 100 : null };
}

function rateLinesSummary(estimate: PartnerEstimate): string | null {
  if (!estimate.rateDisplay || estimate.rateDisplay.lines.length === 0) return null;
  return estimate.rateDisplay.lines.map((l) => `${l.label} ${l.value}`).join(" · ");
}

interface TopThreeCardsProps {
  ranking: RankingSummary;
  currentAcquirerName: string | null;
  currentCost: number | null;
  isSingleDayStatement: boolean;
}

export default function TopThreeCards({
  ranking,
  currentAcquirerName,
  currentCost,
  isSingleDayStatement,
}: TopThreeCardsProps) {
  const bestForMerchant = rankBestForMerchant(ranking.estimates);
  const bestCommercial = ranking.bestForTmp.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="border-2 border-emerald-400 bg-emerald-50/60 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">Best for Merchant</h3>
        <p className="text-sm text-neutral-500 mb-1">
          Current: <span className="font-medium text-neutral-700">{currentAcquirerName || "Not stated"}</span> ·{" "}
          {fmtMoney(currentCost)} current cost
        </p>
        {bestForMerchant.length === 0 ? (
          <p className="text-base text-neutral-400 border border-neutral-200 bg-white px-4 py-3 mt-2">
            No partners have a calculable figure for this statement.
          </p>
        ) : (
          <RankedGroup
            entries={bestForMerchant}
            renderPrimary={(estimate, worthQuoting) => (
              <MerchantPrimaryCard
                estimate={estimate}
                worthQuoting={worthQuoting}
                saving={savingFor(currentCost, estimate, !isSingleDayStatement)}
              />
            )}
            renderCompact={(estimate, worthQuoting, rank) => (
              <CompactRow
                rank={rank}
                name={estimate.partner}
                detail={rateLinesSummary(estimate) ?? estimate.quotableRateSummary ?? undefined}
                value={fmtMoney(estimate.estimatedCost)}
                worthQuoting={worthQuoting}
              />
            )}
          />
        )}
      </section>

      <section className="border-2 border-cyan-400 bg-cyan-50/60 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1">Best Commercial Option</h3>
        <p className="text-sm text-neutral-600 mb-3">
          Highest estimated commission, using the best figure available for each partner.
        </p>
        {bestCommercial.length === 0 ? (
          <p className="text-base text-neutral-400 border border-neutral-200 bg-white px-4 py-3">
            No partners have a calculable figure for this statement.
          </p>
        ) : (
          <RankedGroup
            entries={bestCommercial.map((estimate) => ({ estimate, worthQuoting: false }))}
            renderPrimary={(estimate) => <CommercialPrimaryCard estimate={estimate} />}
            renderCompact={(estimate, _worthQuoting, rank) => (
              <CompactRow
                rank={rank}
                name={estimate.partner}
                detail={estimate.upfrontCommissionSummary ?? undefined}
                value={`${estimate.tmpValueIsEstimate ? "~" : ""}${fmtMoney(estimate.tmpValue)}`}
              />
            )}
          />
        )}
        {ranking.bestForTmp.length > 0 && (
          <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{ranking.bestForTmpCaveat}</p>
        )}
      </section>
    </div>
  );
}

function RankedGroup({
  entries,
  renderPrimary,
  renderCompact,
}: {
  entries: RankedEntry[];
  renderPrimary: (estimate: PartnerEstimate, worthQuoting: boolean) => React.ReactNode;
  renderCompact: (estimate: PartnerEstimate, worthQuoting: boolean, rank: number) => React.ReactNode;
}) {
  const [first, ...rest] = entries;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {renderPrimary(first.estimate, first.worthQuoting)}
      {rest.length > 0 && (
        <div className="border border-neutral-200 divide-y divide-neutral-200 bg-white">
          {rest.map((entry, i) => (
            <div key={entry.estimate.partner}>{renderCompact(entry.estimate, entry.worthQuoting, i + 2)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MerchantPrimaryCard({
  estimate,
  worthQuoting,
  saving,
}: {
  estimate: PartnerEstimate;
  worthQuoting: boolean;
  saving: { label: string; amount: number; annual: number | null } | null;
}) {
  return (
    <div className="border-2 border-emerald-500 bg-white shadow-[0_2px_10px_rgba(5,150,105,0.12)]">
      <div className="px-4 sm:px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-2">
        <span className="text-xl font-bold text-neutral-900">
          <span className="text-emerald-600 mr-2 tabular-nums">1.</span>
          {estimate.partner}
        </span>
        {worthQuoting && (
          <span className="text-xs font-semibold uppercase tracking-wide border border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0.5">
            Worth quoting
          </span>
        )}
      </div>
      <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
        {estimate.rateDisplay && (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {estimate.rateDisplay.lines.map((line) => (
              <div key={line.label}>
                <span className="text-xs uppercase tracking-wide text-neutral-400 block">{line.label}</span>
                <span className="text-lg font-semibold text-neutral-900">{line.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-400 block">Estimated cost</span>
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
              {fmtMoney(estimate.estimatedCost)}
            </span>
          </div>
          {saving && (
            <div>
              <span className="text-xs uppercase tracking-wide text-emerald-700 block">{saving.label}</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums leading-none">
                {fmtMoney(saving.amount)}
                <span className="text-sm font-normal text-emerald-600"> /month</span>
              </span>
              {saving.annual !== null && (
                <span className="text-sm text-emerald-600 block mt-0.5">≈ {fmtMoney(saving.annual)} /year</span>
              )}
            </div>
          )}
        </div>
        <a
          href={`#provider-${slugify(estimate.partner)}`}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 self-start"
        >
          View in full comparison ↓
        </a>
      </div>
    </div>
  );
}

function CommercialPrimaryCard({ estimate }: { estimate: PartnerEstimate }) {
  return (
    <div className="border-2 border-cyan-500 bg-white shadow-[0_2px_10px_rgba(8,145,178,0.12)]">
      <div className="px-4 sm:px-5 py-3 border-b border-neutral-100">
        <span className="text-xl font-bold text-neutral-900">
          <span className="text-cyan-600 mr-2 tabular-nums">1.</span>
          {estimate.partner}
        </span>
      </div>
      <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-400 block">Upfront commission</span>
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
              {estimate.tmpValueIsEstimate ? "~" : ""}
              {fmtMoney(estimate.tmpValue)}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-400 block">Residual</span>
            <span className="text-lg font-semibold text-neutral-800">{estimate.residualSummary ?? "—"}</span>
          </div>
        </div>
        <a
          href={`#provider-${slugify(estimate.partner)}`}
          className="text-sm font-medium text-cyan-700 hover:text-cyan-900 underline underline-offset-2 self-start"
        >
          View in full comparison ↓
        </a>
      </div>
    </div>
  );
}

function CompactRow({
  rank,
  name,
  detail,
  value,
  worthQuoting,
}: {
  rank: number;
  name: string;
  detail?: string;
  value: string;
  worthQuoting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-base text-neutral-700 min-w-0 truncate">
        <span className="text-neutral-400 mr-2 tabular-nums">{rank}.</span>
        <span className="font-medium text-neutral-900">{name}</span>
        {detail && <span className="text-neutral-400"> — {detail}</span>}
        {worthQuoting && <span className="text-amber-700 text-sm font-medium"> (worth quoting)</span>}
      </span>
      <span className="text-base font-semibold text-neutral-900 tabular-nums shrink-0">{value}</span>
    </div>
  );
}
