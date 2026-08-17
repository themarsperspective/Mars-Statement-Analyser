import { ExtractedData, PartnerEstimate } from "@/lib/types";
import { computeRanking } from "@/lib/ranking";
import { PARTNER_RATE_CARDS, PARTNER_PORTAL_LINKS } from "@/lib/partnerRates";
import Chevron from "./Chevron";

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-neutral-400";

const RANK_ACCENTS = {
  emerald: {
    box: "border-2 border-emerald-400 bg-emerald-50/80 shadow-[0_2px_10px_rgba(5,150,105,0.12)]",
    label: "text-emerald-800",
    rank: "text-emerald-600",
    value: "text-emerald-900",
  },
  cyan: {
    box: "border-2 border-cyan-400 bg-cyan-50/80 shadow-[0_2px_10px_rgba(8,145,178,0.12)]",
    label: "text-cyan-800",
    rank: "text-cyan-600",
    value: "text-cyan-900",
  },
} as const;

/** Free-form info stickers shown on a partner's card, beyond the standard rate/commission fields. */
const PARTNER_BADGES: Record<string, string> = {
  "Epos Now": "Good for high-risk businesses",
};

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function na(text: string | null): string {
  return text ?? "Not available";
}

export default function PartnerRanking({ data }: { data: ExtractedData }) {
  const ranking = computeRanking(data);
  const rateCardByName = new Map(PARTNER_RATE_CARDS.map((p) => [p.partner, p]));

  return (
    <div className="border border-neutral-900">
      <div className="bg-neutral-900 text-white px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider">Internal Use Only</p>
        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
          TMP decision-support estimates, not a neutral or customer-facing comparison. Figures are
          calculated from this statement&apos;s turnover against each partner&apos;s on-file rates —
          verify before quoting or relying on any number here.
        </p>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-9">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <RankedListSection
            title="Best for Merchant"
            subtitle="Top 3 by lowest estimated transaction cost, calculable partners only."
            items={ranking.bestForMerchant}
            valueKey="estimatedCost"
            showRate
            accent="emerald"
          />

          <RankedListSection
            title="Best for TMP"
            subtitle="Highest estimated commission, using the best figure available for each partner."
            items={ranking.bestForTmp}
            valueKey="tmpValue"
            caveat={ranking.bestForTmp.length > 0 ? ranking.bestForTmpCaveat : null}
            accent="cyan"
          />
        </div>

        <section>
          <h3 className={`${SECTION_LABEL} mb-3`}>Partner Detail</h3>
          <div className="flex flex-col gap-4">
            {ranking.estimates.map((est) => (
              <PartnerCard key={est.partner} estimate={est} rateCard={rateCardByName.get(est.partner)} />
            ))}
          </div>
        </section>

        <section>
          <h3 className={`${SECTION_LABEL} mb-1`}>Other Options</h3>
          <p className="text-xs text-neutral-400 mb-3">
            No pricing data on file yet — listed for awareness only, not ranked or compared.
          </p>
          <div className="flex flex-wrap gap-2">
            {ranking.otherOptions.map((name) => (
              <span
                key={name}
                className="text-xs border border-neutral-300 px-3 py-1.5 text-neutral-600"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RankedListSection({
  title,
  subtitle,
  items,
  valueKey,
  caveat,
  showRate,
  accent,
}: {
  title: string;
  subtitle: string;
  items: PartnerEstimate[];
  valueKey: "estimatedCost" | "tmpValue";
  caveat?: string | null;
  showRate?: boolean;
  accent: keyof typeof RANK_ACCENTS;
}) {
  const a = RANK_ACCENTS[accent];
  return (
    <section className={`${a.box} p-4 sm:p-5`}>
      <h3 className={`text-[11px] font-bold uppercase tracking-wider ${a.label} mb-1`}>{title}</h3>
      <p className="text-xs text-neutral-600 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400 border border-neutral-200 bg-white px-4 py-3">
          No partners have a calculable figure for this statement.
        </p>
      ) : (
        <>
          <ol className="border border-neutral-200 divide-y divide-neutral-200 bg-white">
            {items.map((item, i) => (
              <li key={item.partner} className="flex flex-col gap-1 px-4 py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-neutral-900">
                    <span className={`${a.rank} mr-2 tabular-nums`}>{i + 1}.</span>
                    {item.partner}
                  </span>
                  <span className={`text-sm font-bold ${a.value} tabular-nums shrink-0`}>
                    {valueKey === "tmpValue" && item.tmpValueIsEstimate ? "~" : ""}
                    {fmtMoney(item[valueKey])}
                  </span>
                </div>
                {showRate && item.quotableRateSummary && (
                  <p className="text-xs text-neutral-500 pl-5 leading-snug">{item.quotableRateSummary}</p>
                )}
              </li>
            ))}
          </ol>
          {caveat && <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{caveat}</p>}
        </>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  const isNA = value === null || value === "Not available";
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] sm:grid-cols-[160px_minmax(0,1fr)] gap-2 px-4 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={isNA ? "text-neutral-400 italic" : "text-neutral-800"}>{na(value)}</span>
    </div>
  );
}

function CondensedRow({ label, value }: { label: string; value: string | null }) {
  const isNA = value === null || value === "Not available";
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className={`text-sm text-right ${isNA ? "text-neutral-400 italic" : "text-neutral-800 font-medium"}`}>
        {na(value)}
      </span>
    </div>
  );
}

function PartnerCard({
  estimate,
  rateCard,
}: {
  estimate: PartnerEstimate;
  rateCard?: (typeof PARTNER_RATE_CARDS)[number];
}) {
  const isTeya = estimate.partner === "Teya";
  const portalLink = PARTNER_PORTAL_LINKS[estimate.partner];
  const badge = PARTNER_BADGES[estimate.partner];

  return (
    <div className="border border-neutral-200">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-neutral-900">{estimate.partner}</span>
            {badge && (
              <span className="text-[10px] font-semibold uppercase tracking-wide border border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0.5">
                {badge}
              </span>
            )}
          </span>
          {!isTeya && portalLink && (
            <a
              href={portalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline underline-offset-2 text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
            >
              Partner portal ↗
            </a>
          )}
        </div>
        {isTeya ? (
          <a
            href={portalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-2 text-neutral-700 hover:text-neutral-900 transition-colors min-w-0 mt-2 inline-block"
          >
            Rate to be verified — check Teya&apos;s pricing calculator ↗
          </a>
        ) : estimate.quotableRateSummary ? (
          <div className="mt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block mb-0.5">
              Rate to quote
            </span>
            <span className="text-base font-bold text-neutral-900 leading-snug">
              {estimate.quotableRateSummary}
            </span>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 italic mt-2">No quotable rate on file.</p>
        )}
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        <CondensedRow label="Terminal cost" value={rateCard?.terminalCostText ?? null} />
        {!isTeya && (
          <CondensedRow
            label="Est. cost this period"
            value={estimate.estimatedCost !== null ? fmtMoney(estimate.estimatedCost) : null}
          />
        )}
        <CondensedRow label="Upfront commission" value={estimate.upfrontCommissionSummary} />
        <CondensedRow label="Residual" value={estimate.residualSummary} />
        {estimate.flag && (
          <p className="text-sm text-neutral-800 font-medium pt-1 border-t border-neutral-100">
            {estimate.flag}
          </p>
        )}
      </div>

      <details className="group border-t border-neutral-200">
        <summary className="cursor-pointer select-none list-none px-4 py-2.5 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
          <Chevron />
          View full details
        </summary>
        <div className="divide-y divide-neutral-100 border-t border-neutral-100">
          <Field
            label="Estimated cost"
            value={
              estimate.estimatedCost !== null
                ? `${fmtMoney(estimate.estimatedCost)}${estimate.costNote ? ` — ${estimate.costNote}` : ""}`
                : estimate.costUnavailableReason
            }
          />
          <Field
            label="TMP value"
            value={
              estimate.tmpValue !== null
                ? `${fmtMoney(estimate.tmpValue)}${estimate.tmpValueNote ? ` — ${estimate.tmpValueNote}` : ""}`
                : (estimate.tmpValueNote ?? estimate.tmpValueUnavailableReason)
            }
          />
          {rateCard && (
            <>
              <Field label="Pricing model" value={rateCard.pricingModel} />
              <Field label="CP rate" value={rateCard.cpRateText} />
              <Field label="CNP rate" value={rateCard.cnpRateText} />
              <Field label="Volume tiers" value={rateCard.volumeTiersText} />
              <Field label="Authorisation fee" value={rateCard.authFeeText} />
              <Field label="PCI DSS fee" value={rateCard.pciFeeText} />
              <Field label="Min. monthly charge" value={rateCard.mmscText} />
              <Field label="Terminal cost" value={rateCard.terminalCostText} />
              <Field label="Setup fee" value={rateCard.setupFeeText} />
              <Field label="Early termination fee" value={rateCard.earlyTerminationFeeText} />
              <Field label="Upfront commission" value={rateCard.upfrontCommissionText} />
              <Field label="Residual / revshare" value={rateCard.residualText} />
              <Field label="Residual basis" value={rateCard.residualBasisText} />
              <Field label="Residual duration" value={rateCard.residualDurationText} />
              <Field label="Payment terms" value={rateCard.paymentTermsText} />
              <Field label="Clawback conditions" value={rateCard.clawbackText} />
            </>
          )}
        </div>
      </details>
    </div>
  );
}
