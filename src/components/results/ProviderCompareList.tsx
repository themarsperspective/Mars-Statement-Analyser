import Chevron from "../Chevron";
import PricingStatusBadge from "./PricingStatusBadge";
import { PartnerEstimate, PartnerRateCard } from "@/lib/types";
import { PARTNER_PORTAL_LINKS } from "@/lib/partnerRates";

const PARTNER_BADGES: Record<string, string> = {
  "Epos Now": "Good for high-risk businesses",
};

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function na(text: string | null | undefined): string {
  return text ?? "Not available";
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function hardwareSummary(rateCard?: PartnerRateCard): string {
  if (rateCard?.hardwareTiers && rateCard.hardwareTiers.length > 0) {
    const first = rateCard.hardwareTiers[0];
    return `${first.device} from ${first.tiers[0]?.price ?? "—"}`;
  }
  if (rateCard?.terminalCostText) {
    return rateCard.terminalCostText.length > 70
      ? `${rateCard.terminalCostText.slice(0, 67)}…`
      : rateCard.terminalCostText;
  }
  return "Not stated";
}

/** Quick monthly-rental range across all hardwareTiers, e.g. "£10-£25/month". Only considers
 * "/month" and "Free" tier prices — one-time "buy outright" prices are deliberately excluded. */
function terminalCostRangeSummary(rateCard?: PartnerRateCard): string | null {
  if (!rateCard?.hardwareTiers || rateCard.hardwareTiers.length === 0) return null;
  const monthly: number[] = [];
  for (const device of rateCard.hardwareTiers) {
    for (const tier of device.tiers) {
      if (/^free$/i.test(tier.price.trim())) {
        monthly.push(0);
        continue;
      }
      const match = tier.price.match(/£(\d+(?:\.\d+)?)\s*\/\s*month/i);
      if (match) monthly.push(parseFloat(match[1]));
    }
  }
  if (monthly.length === 0) return null;
  const min = Math.min(...monthly);
  const max = Math.max(...monthly);
  const fmt = (n: number) => (n === 0 ? "Free" : `£${Number.isInteger(n) ? n : n.toFixed(2)}`);
  return min === max ? `${fmt(min)}/month` : `${fmt(min)}-${fmt(max)}/month`;
}

export default function ProviderCompareList({
  estimates,
  rateCardByName,
  totalActualCharges,
}: {
  estimates: PartnerEstimate[];
  rateCardByName: Map<string, PartnerRateCard>;
  totalActualCharges: number;
}) {
  return (
    <details className="group border border-neutral-200">
      <summary className="cursor-pointer select-none list-none px-5 py-4 flex items-center justify-between transition-colors bg-neutral-50 hover:bg-neutral-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          View Full Comparison ({estimates.length})
        </span>
        <Chevron />
      </summary>
      <div className="border-t border-neutral-200 p-5 sm:p-6 bg-white flex flex-col gap-4">
        {estimates.map((estimate) => (
          <ProviderCard
            key={estimate.partner}
            estimate={estimate}
            rateCard={rateCardByName.get(estimate.partner)}
            totalActualCharges={totalActualCharges}
          />
        ))}
      </div>
    </details>
  );
}

function ProviderCard({
  estimate,
  rateCard,
  totalActualCharges,
}: {
  estimate: PartnerEstimate;
  rateCard?: PartnerRateCard;
  totalActualCharges: number;
}) {
  const portalLink = PARTNER_PORTAL_LINKS[estimate.partner];
  const badge = PARTNER_BADGES[estimate.partner];
  const saving = totalActualCharges - (estimate.estimatedCost ?? 0);
  const showSaving = estimate.pricingStatus !== "unavailable" && estimate.estimatedCost !== null && saving > 0;
  const savingLabel = estimate.pricingStatus === "calculated" ? "Estimated Saving" : "Indicative Saving";
  const terminalLine = terminalCostRangeSummary(rateCard);

  return (
    <div id={`provider-${slugify(estimate.partner)}`} className="border border-neutral-200 scroll-mt-4">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-lg text-neutral-900">{estimate.partner}</span>
            {badge && (
              <span className="text-xs font-semibold uppercase tracking-wide border border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0.5">
                {badge}
              </span>
            )}
          </span>
          <PricingStatusBadge status={estimate.pricingStatus} />
        </div>
        {estimate.rateDisplay ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {estimate.rateDisplay.lines.map((line) => (
              <span key={line.label} className="text-base text-neutral-800">
                <span className="text-neutral-500">{line.label}: </span>
                <span className="font-semibold">{line.value}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-base text-neutral-400 italic">{na(estimate.costUnavailableReason)}</p>
        )}
        {terminalLine && (
          <p className="text-sm text-neutral-500">
            Terminal: <span className="font-medium text-neutral-700">{terminalLine}</span>
          </p>
        )}
      </div>

      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-neutral-100">
        <MiniStat label="Est. cost" value={fmtMoney(estimate.estimatedCost)} />
        <MiniStat label={savingLabel} value={showSaving ? fmtMoney(saving) : "—"} muted={!showSaving} />
        <MiniStat label="Hardware" value={hardwareSummary(rateCard)} small />
        <MiniStat label="Upfront commission" value={na(estimate.upfrontCommissionSummary)} small />
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <details className="group/details flex-1">
          <summary className="cursor-pointer select-none list-none inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide bg-neutral-900 text-white px-3.5 py-2.5 hover:bg-neutral-700 transition-colors">
            View Details
            <span className="group-open/details:rotate-180 transition-transform">▾</span>
          </summary>
          <ProviderDetails estimate={estimate} rateCard={rateCard} />
        </details>
        {portalLink && (
          <a
            href={portalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-2 text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
          >
            Partner Portal ↗
          </a>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, muted, small }: { label: string; value: string; muted?: boolean; small?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">{label}</span>
      <span className={`${small ? "text-sm" : "text-base"} font-medium ${muted ? "text-neutral-300" : "text-neutral-800"} truncate block`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const isNA = value === null || value === undefined || value === "Not available";
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] sm:grid-cols-[160px_minmax(0,1fr)] gap-2 px-4 py-2.5 text-base">
      <span className="text-neutral-500">{label}</span>
      <span className={isNA ? "text-neutral-400 italic" : "text-neutral-800"}>{na(value)}</span>
    </div>
  );
}

function ProviderDetails({ estimate, rateCard }: { estimate: PartnerEstimate; rateCard?: PartnerRateCard }) {
  return (
    <div className="mt-3 border border-neutral-200">
      <SectionHeading>Pricing</SectionHeading>
      <div className="divide-y divide-neutral-100 border-b border-neutral-100">
        <Field label="Pricing model" value={rateCard?.pricingModel} />
        <Field label="CP rate" value={rateCard?.cpRateText} />
        <Field label="CNP rate" value={rateCard?.cnpRateText} />
        <Field label="Volume tiers" value={rateCard?.volumeTiersText} />
        <Field label="Authorisation fee" value={rateCard?.authFeeText} />
        <Field label="PCI DSS fee" value={rateCard?.pciFeeText} />
        <Field label="Min. monthly charge" value={rateCard?.mmscText} />
        <Field label="Setup fee" value={rateCard?.setupFeeText} />
        <Field label="Early termination fee" value={rateCard?.earlyTerminationFeeText} />
      </div>

      <SectionHeading>Hardware</SectionHeading>
      <div className="border-b border-neutral-100">
        {rateCard?.hardwareTiers && rateCard.hardwareTiers.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {rateCard.hardwareTiers.map((device) => (
              <div key={device.device} className="px-4 py-3">
                <p className="text-base font-semibold text-neutral-900 mb-1">{device.device}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {device.tiers.map((tier) => (
                    <span key={tier.label} className="text-base text-neutral-700">
                      <span className="text-neutral-500">{tier.label}: </span>
                      <span className="font-medium">{tier.price}</span>
                    </span>
                  ))}
                </div>
                {device.note && <p className="text-sm text-neutral-500 mt-1">{device.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <Field label="Terminal cost" value={rateCard?.terminalCostText} />
        )}
      </div>

      <SectionHeading>Estimated Cost</SectionHeading>
      <div className="px-4 py-3 border-b border-neutral-100">
        {estimate.estimatedCost !== null ? (
          <>
            <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none">{fmtMoney(estimate.estimatedCost)}</p>
            {estimate.costNote && <p className="text-base text-neutral-600 mt-2">{estimate.costNote}</p>}
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-neutral-500">Unable to calculate</p>
            <p className="text-base text-neutral-500 mt-1">
              <span className="text-neutral-400">Reason: </span>
              {na(estimate.costUnavailableReason)}
            </p>
          </>
        )}
      </div>

      <details className="group border-b border-neutral-100">
        {/* Internal Commercial Details — excluded from any future merchant-facing Proposal export; that feature isn't built yet. */}
        <summary className="cursor-pointer select-none list-none px-4 py-2.5 flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-neutral-50">
          <Chevron />
          Internal Commercial Details
        </summary>
        <div className="divide-y divide-neutral-100">
          <Field
            label="Your commission"
            value={
              estimate.tmpValue !== null
                ? `${fmtMoney(estimate.tmpValue)}${estimate.tmpValueNote ? ` — ${estimate.tmpValueNote}` : ""}`
                : (estimate.tmpValueNote ?? estimate.tmpValueUnavailableReason)
            }
          />
          <Field label="Upfront commission" value={rateCard?.upfrontCommissionText} />
          <Field label="Residual / revshare" value={rateCard?.residualText} />
          <Field label="Residual basis" value={rateCard?.residualBasisText} />
          <Field label="Residual duration" value={rateCard?.residualDurationText} />
          <Field label="Payment terms" value={rateCard?.paymentTermsText} />
          <Field label="Clawback conditions" value={rateCard?.clawbackText} />
        </div>
      </details>

      {estimate.flag && (
        <>
          <SectionHeading>Important Notes</SectionHeading>
          <p className="px-4 py-3 text-base text-neutral-700">{estimate.flag}</p>
        </>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 px-4 py-2 bg-neutral-50 border-b border-neutral-100">
      {children}
    </h4>
  );
}
