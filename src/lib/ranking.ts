// Partner comparison / ranking engine — internal TMP decision-support tool only.
//
// Methodology (shown to the user alongside every result, not hidden):
// "Estimated cost" = this statement's turnover × the partner's applicable blended/CP rate
// (using the partner's standard Consumer Debit rate as the blended proxy for partners who
// price by card type, since statements don't reliably give a card-type transaction mix),
// plus authorisation fees at transaction count. Fixed monthly-type fees (PCI, MMSC,
// terminal, setup) are NOT included in this figure — they're shown separately, since a
// statement can cover a period shorter than a month and folding a monthly fee into a
// period-based cost would misrepresent it.
//
// A field is only ever populated when the source data gives an actual figure. Anything
// genuinely blank or non-computable is surfaced as "Not available" with a reason —
// never estimated or guessed.
import { ExtractedData, MyposPackage, NOT_AVAILABLE, PartnerEstimate, RankingSummary } from "./types";
import { MYPOS_TARIFF_TABLE } from "./myposTariff";
import { OTHER_OPTION_PARTNERS } from "./partnerRates";

const BEST_FOR_TMP_CAVEAT =
  "Ranked using the best available figure for each partner — some (marked ~) are the highest achievable tier or ceiling rather than a fixed confirmed commission, and depend on choices TMP makes when quoting (e.g. terminal rental tier, rate offered). More complete data from partners is needed for a fully accurate ranking.";

const MYPOS_UPFRONT_SUMMARY = "£100–£600 (by rental tier)";
const MYPOS_RESIDUAL_SUMMARY = "30% of Net Revenue";
const DNA_UPFRONT_SUMMARY = "Not stated";
const DNA_RESIDUAL_SUMMARY = "30% of Net Recurring Revenue";
const SHIFT4_UPFRONT_SUMMARY = "£500";
const SHIFT4_RESIDUAL_SUMMARY = "50%, basis unconfirmed";
const TEYA_UPFRONT_SUMMARY = "£500";
const TEYA_RESIDUAL_SUMMARY = "50%, basis unconfirmed";
const EPOS_NOW_UPFRONT_SUMMARY = "Up to £350 at 1.5%; less at 1% (not stated)";
const EPOS_NOW_RESIDUAL_SUMMARY = "50% (Platinum only); other tiers unstated";
const IGNITE_UPFRONT_SUMMARY = "£140–£400 (by device/term)";
const IGNITE_RESIDUAL_SUMMARY = "40% above interchange/scheme — requires 1+ new live MID/month company-wide to stay qualified";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// myPOS: pick the best-fit package by ATV/throughput eligibility, using each
// package's Consumer Debit CP rate as the blended proxy.
// ---------------------------------------------------------------------------

function parseAtvRequirement(req: string | null): { min: number; max: number | null } | null {
  if (!req) return null;
  if (/throughput/i.test(req)) return null; // handled separately via throughput gate
  const range = req.match(/£(\d+)\s*-\s*£(\d+)/);
  if (range) return { min: parseFloat(range[1]), max: parseFloat(range[2]) };
  const plus = req.match(/£(\d+)\+/);
  if (plus) return { min: parseFloat(plus[1]), max: null };
  return null;
}

function parseThroughputRequirement(req: string | null): { min: number; max: number | null } | null {
  if (!req || !/throughput/i.test(req)) return null;
  const range = req.match(/£(\d+)k\s*-\s*£(\d+)k/i);
  if (range) return { min: parseFloat(range[1]) * 1000, max: parseFloat(range[2]) * 1000 };
  const plus = req.match(/£(\d+)k\+/i);
  if (plus) return { min: parseFloat(plus[1]) * 1000, max: null };
  const upTo = req.match(/£0\s*-\s*£(\d+)k/i);
  if (upTo) return { min: 0, max: parseFloat(upTo[1]) * 1000 };
  return null;
}

function myposCostFor(pkg: MyposPackage, turnover: number, txnCount: number | null): number {
  const authFeeTotal = txnCount !== null ? txnCount * pkg.authFeeGBP : 0;
  return round2(turnover * (pkg.cpConsumerDebit.percent / 100) + authFeeTotal);
}

function pickLowestRate(pool: MyposPackage[]): MyposPackage | null {
  if (pool.length === 0) return null;
  return pool.reduce((lowest, pkg) => (pkg.cpConsumerDebit.percent < lowest.cpConsumerDebit.percent ? pkg : lowest));
}

function formatMyposRate(rate: { percent: number; surchargePence?: number }): string {
  return rate.surchargePence ? `${rate.percent}%+${rate.surchargePence}p` : `${rate.percent}%`;
}

function myposQuotableRateSummary(pkg: MyposPackage): string {
  const atvSuffix = pkg.atvRequirement ? `, ATV band: ${pkg.atvRequirement}` : "";
  return (
    `CP: ${formatMyposRate(pkg.cpConsumerDebit)} debit / ${formatMyposRate(pkg.cpConsumerCredit)} credit — ` +
    `CNP: ${formatMyposRate(pkg.cnpConsumerDebit)} debit / ${formatMyposRate(pkg.cnpConsumerCredit)} credit ` +
    `(Package ${pkg.packageId}${atvSuffix})`
  );
}

// £600 ceiling, not a mid-point: the rental fee (and so the commission) is TMP's own
// choice of what to charge the merchant for the terminal, not a partner-side constraint —
// so, like Epos Now's rate choice, the top of the range is the figure to rank on.
const MYPOS_TMP_ESTIMATE = 600;

function computeMyposEstimate(data: ExtractedData): PartnerEstimate {
  const partner = "myPOS";
  const turnover = data.totalTurnover;
  const atv = data.averageTransactionValue;
  const txnCount = data.transactionCount;
  const currentRate = data.blendedRate.value;

  if (turnover === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "Statement has no total turnover figure.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: "Upfront FTC commission depends on the merchant's chosen terminal rental tier (£10–£25/month), not determinable from a statement.",
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: MYPOS_UPFRONT_SUMMARY,
      residualSummary: MYPOS_RESIDUAL_SUMMARY,
    };
  }

  const eligible = MYPOS_TARIFF_TABLE.filter((pkg) => {
    const atvReq = parseAtvRequirement(pkg.atvRequirement);
    const throughputReq = parseThroughputRequirement(pkg.atvRequirement);
    if (throughputReq) {
      return turnover >= throughputReq.min && (throughputReq.max === null || turnover < throughputReq.max);
    }
    if (atvReq && atv !== null) {
      return atv >= atvReq.min && (atvReq.max === null || atv <= atvReq.max);
    }
    // Ungated (no ATV/throughput restriction) packages are always eligible.
    return !pkg.atvRequirement;
  });
  const matchedEligibility = eligible.length > 0;

  // Prefer eligible packages; fall back to the whole table (separately for each
  // gate category) only if nothing eligible was found in that category.
  const eligibleNonGated = eligible.filter((p) => !p.approvalGate);
  const eligibleGated = eligible.filter((p) => p.approvalGate);
  const nonGatedPool = eligibleNonGated.length > 0 ? eligibleNonGated : MYPOS_TARIFF_TABLE.filter((p) => !p.approvalGate);
  const gatedPool = eligibleGated.length > 0 ? eligibleGated : MYPOS_TARIFF_TABLE.filter((p) => p.approvalGate);

  const bestNonGated = pickLowestRate(nonGatedPool);
  const bestGated = pickLowestRate(gatedPool);
  const primary = bestNonGated ?? bestGated;

  if (!primary) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "No myPOS package data available.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: null,
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: MYPOS_UPFRONT_SUMMARY,
      residualSummary: MYPOS_RESIDUAL_SUMMARY,
    };
  }

  const primaryCost = myposCostFor(primary, turnover, txnCount);
  const usedGatedAsPrimary = !bestNonGated;

  const noteParts: string[] = [
    `Best-fit package: ${primary.packageId} (Consumer Debit ${primary.cpConsumerDebit.percent}% CP). Consumer Debit CP rate used as blended proxy + authorisation fees. PCI/MMSC not stated for myPOS.`,
  ];
  if (!matchedEligibility) {
    noteParts.push(
      "No package's ATV/throughput requirement matched this statement exactly — using the closest available package as an approximation; verify eligibility."
    );
  }

  let flag: string | null = null;
  if (usedGatedAsPrimary) {
    flag = "Super low rate — may need manager approval";
  } else if (bestGated && currentRate !== null) {
    const nonGatedBeatsCurrent = primary.cpConsumerDebit.percent < currentRate;
    const gatedBeatsCurrent = bestGated.cpConsumerDebit.percent < currentRate;
    if (!nonGatedBeatsCurrent && gatedBeatsCurrent) {
      const gatedCost = myposCostFor(bestGated, turnover, txnCount);
      flag = "May beat their current rate, but needs manager approval";
      noteParts.push(
        `Secondary option: ${bestGated.packageId} at ${bestGated.cpConsumerDebit.percent}% CP (est. £${gatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) — may beat the merchant's current rate, but sits behind a manager-approval gate. Not used as the primary figure above.`
      );
    }
  }

  return {
    partner,
    estimatedCost: primaryCost,
    costNote: noteParts.join(" "),
    costUnavailableReason: null,
    tmpValue: MYPOS_TMP_ESTIMATE,
    tmpValueIsEstimate: true,
    tmpValueNote: "£600 ceiling of the £100–£600 rental-tier commission range, achieved by charging the merchant the £25/month terminal tier — TMP's own choice, not a partner-side constraint. Residual is 30% of Net Revenue, subject to TMP placing 10+ new FTC clients in the same month — not included in this figure since Net Revenue isn't determinable from a statement.",
    tmpValueUnavailableReason: null,
    flag,
    quotableRateSummary: myposQuotableRateSummary(primary),
    upfrontCommissionSummary: MYPOS_UPFRONT_SUMMARY,
    residualSummary: MYPOS_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------
// DNA Payments: only the two anchor turnover bands have a stated Debit rate.
// ---------------------------------------------------------------------------

function computeDnaEstimate(data: ExtractedData): PartnerEstimate {
  const partner = "DNA Payments";
  const turnover = data.totalTurnover;

  if (turnover === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "Statement has no total turnover figure.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: "Upfront commission is not stated for DNA.",
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: DNA_UPFRONT_SUMMARY,
      residualSummary: DNA_RESIDUAL_SUMMARY,
    };
  }

  let ratePercent: number | null = null;
  if (turnover <= 50000) ratePercent = 0.6;
  else if (turnover > 1000000) ratePercent = 0.3;

  if (ratePercent === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason:
        "This turnover falls in one of DNA's intermediate volume bands (£50k–£1m) — only the lowest (£0–£50k, 0.6%) and highest (>£1m, 0.3%) band rates are stated; the bands in between aren't.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: "Upfront commission is not stated for DNA.",
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: DNA_UPFRONT_SUMMARY,
      residualSummary: DNA_RESIDUAL_SUMMARY,
    };
  }

  const bandText = turnover <= 50000 ? "turnover ≤£50k band" : "turnover >£1m band";

  return {
    partner,
    estimatedCost: round2(turnover * (ratePercent / 100)),
    costNote: `Debit CP rate used as blended proxy (${ratePercent}% band). Auth/PCI/MMSC fees not stated for DNA.`,
    costUnavailableReason: null,
    tmpValue: null,
    tmpValueIsEstimate: false,
    tmpValueNote: "Residual is 30% of Net Recurring Revenue (a margin figure) — not included in the ranking figure since DNA's own margin per merchant isn't determinable from a statement. Upfront commission is not stated.",
    tmpValueUnavailableReason: "No upfront commission stated; residual basis is margin, not turnover.",
    flag: null,
    quotableRateSummary: `${ratePercent}% Debit, card-present (${bandText})`,
    upfrontCommissionSummary: DNA_UPFRONT_SUMMARY,
    residualSummary: DNA_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------
// Shift4: genuinely blended, two-tier by monthly turnover threshold.
// ---------------------------------------------------------------------------

function computeShift4Estimate(data: ExtractedData): PartnerEstimate {
  const partner = "Shift4";
  const turnover = data.totalTurnover;

  if (turnover === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "Statement has no total turnover figure.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: null,
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: SHIFT4_UPFRONT_SUMMARY,
      residualSummary: SHIFT4_RESIDUAL_SUMMARY,
    };
  }

  const ratePercent = turnover >= 10000 ? 0.7 : 1.25;
  const tierNote =
    turnover >= 10000
      ? "0.7% blended headline rate (≥£10k/month tier) — TMP has negotiated as low as 0.5–0.6% split by card type; confirm before quoting."
      : "1.25% blended minimum (under £10k/month tier).";
  const quotableRateSummary =
    turnover >= 10000
      ? "0.7% blended, all card types (≥£10k/month tier) — may be negotiable to 0.5–0.6% split by card type; confirm before quoting"
      : "1.25% blended, all card types (under £10k/month tier)";

  return {
    partner,
    estimatedCost: round2(turnover * (ratePercent / 100)),
    costNote: `${tierNote} Auth fee 0p, PCI £0, MMSC £0.`,
    costUnavailableReason: null,
    tmpValue: 500,
    tmpValueIsEstimate: false,
    tmpValueNote: "£500 upfront per activation. Residual is 50% but basis (turnover or margin) is unconfirmed, so not included in this figure.",
    tmpValueUnavailableReason: null,
    flag: null,
    quotableRateSummary,
    upfrontCommissionSummary: SHIFT4_UPFRONT_SUMMARY,
    residualSummary: SHIFT4_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------
// Epos Now: TMP quotes one of two fixed blended rates per merchant — 1%
// (maximises customer saving) or 1.5% (maximises the Payments bounty, up to
// £350). The estimate below uses 1% as the primary/quotable figure, since
// that's the rate that wins on merchant cost; the 1.5% trade-off is surfaced
// in the note rather than silently picked. Commission at the 1% rate isn't
// stated, only the £350 ceiling at 1.5% — so tmpValue stays unscored rather
// than guessed.
// ---------------------------------------------------------------------------

const EPOS_NOW_RATE_LOW = 1.0;
const EPOS_NOW_RATE_HIGH = 1.5;
const EPOS_NOW_RATE_HIGH_COMMISSION = 350; // ceiling bounty, only achievable by quoting EPOS_NOW_RATE_HIGH

function computeEposNowEstimate(data: ExtractedData): PartnerEstimate {
  const partner = "Epos Now";
  const turnover = data.totalTurnover;

  if (turnover === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "Statement has no total turnover figure.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason: "Commission depends on which of the two blended rates (1% or 1.5%) is quoted; the exact figure at 1% isn't stated.",
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: EPOS_NOW_UPFRONT_SUMMARY,
      residualSummary: EPOS_NOW_RESIDUAL_SUMMARY,
    };
  }

  const costAtLow = round2(turnover * (EPOS_NOW_RATE_LOW / 100));
  const costAtHigh = round2(turnover * (EPOS_NOW_RATE_HIGH / 100));

  return {
    partner,
    estimatedCost: costAtLow,
    costNote: `1% blended rate used — the lower of Epos Now's two quotable options, maximising customer saving. At the 1.5% option, estimated cost would be £${costAtHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, which unlocks up to £350 commission. Auth/PCI/MMSC not included.`,
    costUnavailableReason: null,
    tmpValue: EPOS_NOW_RATE_HIGH_COMMISSION,
    tmpValueIsEstimate: true,
    tmpValueNote: "Estimated at the £350 ceiling, only achievable by quoting the 1.5% blended rate (not the 1% rate used for the cost figure above, which maximises customer saving instead). Commission at 1% isn't stated. Platinum tier residual (50% of net acquiring revenue) is the only quantified residual tier.",
    tmpValueUnavailableReason: null,
    flag: "Two rate options — 1% (best for merchant, shown here) or 1.5% (up to £350 commission)",
    quotableRateSummary: "1% blended (max customer saving) — alternative: 1.5% blended (max commission, up to £350)",
    upfrontCommissionSummary: EPOS_NOW_UPFRONT_SUMMARY,
    residualSummary: EPOS_NOW_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------
// Teya: never auto-ranked on a guessed figure — always listed, never scored.
// This is a deliberate exception to the "best-available estimate" policy used
// for myPOS/Epos Now above: Teya has no rate on file at all (calculator-based
// pricing per merchant), so there's no reasonable range to take a mid-point
// or ceiling from — tmpValue stays null and Teya is excluded from Best for TMP.
// ---------------------------------------------------------------------------

const TEYA_NOTE = "Rate to be verified — check Teya's pricing calculator";
const TEYA_LINK = "https://partner.teya.com";

function computeTeyaEstimate(): PartnerEstimate {
  return {
    partner: "Teya",
    estimatedCost: null,
    costNote: null,
    costUnavailableReason: `${TEYA_NOTE}: no confirmed negotiated CP/CNP rate on file — Teya prices per-merchant via its own calculator. Check ${TEYA_LINK}.`,
    tmpValue: null,
    tmpValueIsEstimate: false,
    tmpValueNote: "£500 upfront per activation. Residual is 50% but basis (turnover or margin) is unconfirmed.",
    tmpValueUnavailableReason: "Residual and upfront both real, but can't be scored against a merchant cost that isn't calculable for Teya.",
    flag: TEYA_NOTE,
    quotableRateSummary: null,
    upfrontCommissionSummary: TEYA_UPFRONT_SUMMARY,
    residualSummary: TEYA_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------
// Ignite (Clover Flex / Flex Pocket): rates are given as min-max bands per
// card type, not a single fixed rate — TMP sets where in the band to sell.
// The estimate below uses the MINIMUM of the Consumer Debit band as a
// best-case figure (the most competitive TMP could sell at), clearly labelled
// so it's never read as a guaranteed number. Commission is a flat per-device
// amount that varies by device and contract term, not a % of turnover; the
// £400 ceiling (Clover Flex, 36-month term) is used for ranking, same "TMP's
// own choice, use the top of the range" logic as myPOS/Epos Now above.
// ---------------------------------------------------------------------------

const IGNITE_MIN_RATE = 0.29; // Consumer Debit, minimum sellable (best-case)
const IGNITE_MAX_RATE = 1.49; // Consumer Debit, maximum sellable
const IGNITE_TMP_ESTIMATE = 400; // ceiling: Clover Flex, 36-month term

function computeIgniteEstimate(data: ExtractedData): PartnerEstimate {
  const partner = "Ignite";
  const turnover = data.totalTurnover;

  if (turnover === null) {
    return {
      partner,
      estimatedCost: null,
      costNote: null,
      costUnavailableReason: "Statement has no total turnover figure.",
      tmpValue: null,
      tmpValueIsEstimate: false,
      tmpValueNote: null,
      tmpValueUnavailableReason:
        "Commission depends on which Clover device (Flex or Flex Pocket) and contract term (36 or 48 months) is sold — not determinable from a statement.",
      flag: null,
      quotableRateSummary: null,
      upfrontCommissionSummary: IGNITE_UPFRONT_SUMMARY,
      residualSummary: IGNITE_RESIDUAL_SUMMARY,
    };
  }

  return {
    partner,
    estimatedCost: round2(turnover * (IGNITE_MIN_RATE / 100)),
    costNote: `Best-case rate (Ignite's minimum sellable rate) — ${IGNITE_MIN_RATE}% Consumer Debit used as blended proxy. Ignite sets a fixed min/max band per card type (${IGNITE_MIN_RATE}%–${IGNITE_MAX_RATE}% Consumer Debit); the actual rate quoted to this merchant may be higher. Auth/PCI/MMSC fees are also range-based on Ignite's schedule and not included here.`,
    costUnavailableReason: null,
    tmpValue: IGNITE_TMP_ESTIMATE,
    tmpValueIsEstimate: true,
    tmpValueNote:
      "£400 ceiling — the top of Ignite's per-device commission range (Clover Flex, 36-month term). Full range: Flex £400 (36-month) / £200 (48-month); Flex Pocket £140 (36-month) / £280 (48-month). Residual is 40% above interchange/scheme fees, but requires 1+ new live MID per month across TMP's whole Ignite relationship — not per merchant — to stay qualified; not included in this figure.",
    tmpValueUnavailableReason: null,
    flag: "Best-case rate shown — actual quoted rate may be higher, up to 1.49% max",
    quotableRateSummary: `Best-case rate (Ignite's minimum sellable rate): ${IGNITE_MIN_RATE}% Consumer Debit / 0.50% Consumer Credit (blended min. band) — up to ${IGNITE_MAX_RATE}% max, per merchant negotiation`,
    upfrontCommissionSummary: IGNITE_UPFRONT_SUMMARY,
    residualSummary: IGNITE_RESIDUAL_SUMMARY,
  };
}

// ---------------------------------------------------------------------------

export function computeRanking(data: ExtractedData): RankingSummary {
  const estimates: PartnerEstimate[] = [
    computeMyposEstimate(data),
    computeDnaEstimate(data),
    computeShift4Estimate(data),
    computeTeyaEstimate(),
    computeEposNowEstimate(data),
    computeIgniteEstimate(data),
  ];

  const bestForMerchant = estimates
    .filter((e) => e.estimatedCost !== null)
    .sort((a, b) => (a.estimatedCost ?? 0) - (b.estimatedCost ?? 0))
    .slice(0, 3);

  // Ranked using every partner with a known-or-estimated commission figure,
  // not just those within a fixed % of the cheapest merchant cost — the
  // caveat below flags where a figure is an estimate rather than confirmed.
  const bestForTmp = estimates
    .filter((e) => e.tmpValue !== null && e.estimatedCost !== null)
    .sort((a, b) => (b.tmpValue ?? 0) - (a.tmpValue ?? 0));

  return {
    estimates,
    bestForMerchant,
    bestForTmp,
    bestForTmpCaveat: BEST_FOR_TMP_CAVEAT,
    teyaNote: `${TEYA_NOTE} (${TEYA_LINK})`,
    otherOptions: [...OTHER_OPTION_PARTNERS],
  };
}

export { NOT_AVAILABLE };
