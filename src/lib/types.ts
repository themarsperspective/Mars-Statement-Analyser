export interface FeeItem {
  label: string;
  amount: number | null;
}

export interface RateCardItem {
  label: string;
  rate: string;
}

export interface SchemeRate {
  scheme: string;
  ratePercent: number | null;
}

export interface BlendedRate {
  value: number | null;
  source: "stated" | "calculated" | null;
}

export interface ExtractedData {
  merchantName: string | null;
  acquirerName: string | null;
  statementPeriod: string | null;
  mcc: string;
  totalTurnover: number | null;
  transactionCount: number | null;
  averageTransactionValue: number | null;
  blendedRate: BlendedRate;
  schemeRates: SchemeRate[];
  rateCard: RateCardItem[];
  actualCharges: FeeItem[];
  otherAdjustments: FeeItem[];
}

export interface SavedStatement {
  id: string;
  sourceFileName: string;
  savedAt: string;
  data: ExtractedData;
}

export const NOT_STATED = "Not stated on statement";

export function emptyExtractedData(): ExtractedData {
  return {
    merchantName: null,
    acquirerName: null,
    statementPeriod: null,
    mcc: NOT_STATED,
    totalTurnover: null,
    transactionCount: null,
    averageTransactionValue: null,
    blendedRate: { value: null, source: null },
    schemeRates: [],
    rateCard: [],
    actualCharges: [],
    otherAdjustments: [],
  };
}

// ---------------------------------------------------------------------------
// Partner comparison / ranking (internal TMP decision-support tool)
// ---------------------------------------------------------------------------

export const NOT_AVAILABLE = "Not available";

/** A rate cell as given on the myPOS tariff sheet, e.g. "1.15+0.01p". */
export interface MyposRate {
  percent: number;
  surchargePence?: number;
}

export interface MyposPackage {
  packageId: string;
  cpConsumerDebit: MyposRate;
  cpConsumerCredit: MyposRate;
  cpPremiumConsumerCredit: MyposRate;
  cpCommercialCredit: MyposRate;
  cpCommercialDebit: MyposRate;
  cpVisaBusinessDebit: MyposRate;
  cnpConsumerDebit: MyposRate;
  cnpConsumerCredit: MyposRate;
  cnpPremiumConsumerCredit: MyposRate;
  cnpCommercialCredit: MyposRate;
  cnpCommercialDebit: MyposRate;
  cnpVisaBusinessDebit: MyposRate;
  vpay: MyposRate;
  jcb: MyposRate;
  cnpLevy: MyposRate;
  premiumCnpLevy: MyposRate;
  authFeeGBP: number;
  /** e.g. "£15+", "£10 - £15", or null when ungated on ATV. */
  atvRequirement: string | null;
  /** e.g. "Managers Approval", or null when auto-available. */
  approvalGate: string | null;
}

/** Raw reference fields for a partner, as given on the rate card (Notes/Weaknesses excluded by design). */
export interface PartnerRateCard {
  partner: string;
  hasData: boolean;
  pricingModel: string | null;
  cpRateText: string | null;
  cnpRateText: string | null;
  volumeTiersText: string | null;
  authFeeText: string | null;
  pciFeeText: string | null;
  mmscText: string | null;
  terminalCostText: string | null;
  setupFeeText: string | null;
  earlyTerminationFeeText: string | null;
  upfrontCommissionText: string | null;
  residualText: string | null;
  residualBasisText: string | null;
  residualDurationText: string | null;
  paymentTermsText: string | null;
  clawbackText: string | null;
}

/** A single computed or not-computable result for one partner against one statement. */
export interface PartnerEstimate {
  partner: string;
  /** Estimated transaction-based cost to the merchant for this statement's turnover, or null if not computable. */
  estimatedCost: number | null;
  costNote: string | null;
  costUnavailableReason: string | null;
  /** Flat/known TMP commission figure usable in the "Best for TMP" score, or null if not computable. */
  tmpValue: number | null;
  /** True when tmpValue is a representative estimate (e.g. mid-point of a stated range) rather than an exact confirmed figure. */
  tmpValueIsEstimate: boolean;
  tmpValueNote: string | null;
  tmpValueUnavailableReason: string | null;
  /** Extra context, e.g. myPOS's matched package or a manager-approval flag. */
  flag: string | null;
  /** The actual rate(s) behind estimatedCost, phrased so a sales agent can quote it directly, e.g. "0.31% debit / 0.45% credit CP (Package UTP-UK-053-3p)". Null when no confident rate can be quoted (e.g. Teya, Epos Now). */
  quotableRateSummary: string | null;
  /** One-line upfront commission summary for the condensed card, e.g. "£100–£600 (by rental tier)". */
  upfrontCommissionSummary: string | null;
  /** One-line residual summary for the condensed card, e.g. "30% of Net Revenue". */
  residualSummary: string | null;
}

export interface RankingSummary {
  estimates: PartnerEstimate[];
  bestForMerchant: PartnerEstimate[];
  bestForTmp: PartnerEstimate[];
  /** Always shown beneath the "Best for TMP" list when it has entries — flags that some figures are estimated. */
  bestForTmpCaveat: string;
  teyaNote: string;
  otherOptions: string[];
}
