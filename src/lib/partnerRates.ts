// Transcribed from Partner_Rates_verified_data.xlsx. Notes and Weaknesses columns are
// intentionally excluded — internal reference only, not app data.
//
// CORRECTION: the source row for DNA Payments has its cells shifted one column left from
// "Upfront Commission to TMP per Activation" onward (verified by content — e.g. the text
// landing in "Residual Basis" was self-describing prose about margin/net revenue, not a
// basis label). The fields below are re-aligned by content, not by raw column position.
import { PartnerRateCard } from "./types";
import { DNA_GATEWAY_FEE_TEXT, DNA_PCI_FEE_TEXT, DNA_RATE_BANDS } from "./dnaRates";

const DNA_CP_RATE_TEXT = `Card-present, by monthly turnover band (${DNA_RATE_BANDS[1].label} to ${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].label}): Debit ${DNA_RATE_BANDS[1].debit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].debit}%; Credit ${DNA_RATE_BANDS[1].credit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].credit}%; Business Debit ${DNA_RATE_BANDS[1].businessDebit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].businessDebit}%; Business Credit ${DNA_RATE_BANDS[1].businessCredit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].businessCredit}%. See expanded details for the full band-by-band breakdown.`;
const DNA_CNP_RATE_TEXT = `Online (inc. CNP), by monthly turnover band: Debit ${DNA_RATE_BANDS[1].onlineDebit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].onlineDebit}%; Credit ${DNA_RATE_BANDS[1].onlineCredit}%→${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].onlineCredit}%. See expanded details for the full band-by-band breakdown.`;
const DNA_VOLUME_TIERS_TEXT = `Monthly turnover bands: ${DNA_RATE_BANDS.map((b) => b.label).join(" / ")}.`;
const DNA_AUTH_FEE_TEXT = `${DNA_RATE_BANDS[1].authFeePence}p (lowest bands) down to ${DNA_RATE_BANDS[DNA_RATE_BANDS.length - 1].authFeePence}p (highest bands), by turnover band — see expanded details.`;

export const PARTNER_RATE_CARDS: PartnerRateCard[] = [
  {
    partner: "myPOS",
    hasData: true,
    pricingModel:
      "Blended, package-based (UTP tariff sheet) - not interchange++. Around 49 packages ('UTP-UK-xxx'), each with its own fixed CP and CNP rate per card type.",
    cpRateText:
      "Consumer Debit 0.23%-1.20% (most packages 0.24-0.66%; only the low-throughput SIMT tiers sit at 0.80-1.20%); Consumer Credit 0.50%-1.11%. Commercial Credit/Debit and Visa Business Debit run higher per package. Full breakdown in the myPOS tariff table.",
    cnpRateText:
      "Consumer Debit/Credit 2.05%-2.45%; Premium Consumer/Commercial Credit up to 2.70%. CNP consistently runs about 1.8-2.0 percentage points above CP for the same package.",
    volumeTiersText:
      "49 packages, banded by ATV (average transaction value) and/or monthly throughput, not one flat tier. About 12 of the lowest-rate packages sit behind a 'Managers Approval' gate. Two small-ATV packages carry a higher 4-5p auth fee, and 5 'SIMT' packages are gated purely by monthly throughput (£0-£50k up to £200k+).",
    authFeeText: "0.03 standard; 0.04 on two packages; 0.05 on one low-ATV package.",
    pciFeeText: null,
    mmscText: null,
    terminalCostText:
      "Merchant-facing rental under Fixed Term Contract (FTC): 18-month standard term, Monthly Fee bands £10–£25/month; subsequent FTCs (same client, repeat terminal) also possible at £13 or £20/month.",
    hardwareTiers: [
      {
        device: "myPOS Terminal (FTC rental)",
        tiers: [
          { label: "Monthly Fee — minimum band", price: "£10/month" },
          { label: "Monthly Fee — maximum band", price: "£25/month" },
        ],
        note: "18-month standard term. 16 pound-increment bands between £10 and £25/month.",
      },
      {
        device: "myPOS Terminal (subsequent FTC, same client)",
        tiers: [
          { label: "Lower band", price: "£13/month" },
          { label: "Upper band", price: "£20/month" },
        ],
      },
    ],
    setupFeeText: null,
    earlyTerminationFeeText: null,
    upfrontCommissionText:
      "FTC Commission per myPOS Terminal, by merchant's Monthly Fee: £10→£100, £11→£140, £12→£180, £13→£220, £14→£260, £15→£300, £16→£340, £17→£380, £18→£420, £19→£460, £20→£500, £21→£520, £22→£540, £23→£560, £24→£580, £25→£600. Subsequent FTC (repeat terminal, same client): £13→£100, £20→£200.",
    residualText:
      "30% of Net Revenue (\"FTC Acquiring Commission\") on card acceptance transactions processed by Solicited Clients under an FTC (18-month standard term). Only payable in a given month if you've introduced at least 10 new Solicited Clients under FTC within that same calendar month.",
    residualBasisText:
      "Revenue/Margin — Net Revenue, with myPOS's own \"Commercial Component\" fixed at £0.00 per card transaction in this calculation.",
    residualDurationText:
      "Tied to monthly eligibility (10-client threshold) — no commission for FTC clients in any month the threshold isn't met. Otherwise stops after 12 months of merchant inactivity; else ongoing while merchant stays active.",
    paymentTermsText:
      "FTC (per-terminal) Commission paid within 5 business days of the Transaction Requirement being met. Acquiring Commission (30%) payment timing not specified.",
    clawbackText: "Full clawback on a 'Reversed Client'. No commission at all for marketplace-sourced clients (Amazon/eBay) or brand-guideline breaches.",
  },
  {
    partner: "DNA Payments",
    hasData: true,
    pricingModel:
      "Interchange++ (IC+). DNA's own margin (\"DNAP Processing Fee\") is defined at 0.00% / £0 on top of interchange — unusually low, confirm directly with DNA.",
    cpRateText: DNA_CP_RATE_TEXT,
    cnpRateText: DNA_CNP_RATE_TEXT,
    volumeTiersText: DNA_VOLUME_TIERS_TEXT,
    authFeeText: DNA_AUTH_FEE_TEXT,
    pciFeeText: `PCI Fee: ${DNA_PCI_FEE_TEXT}. Gateway Fee (ecommerce): ${DNA_GATEWAY_FEE_TEXT}.`,
    mmscText: null,
    terminalCostText:
      "PAX A920 Pro: £325+VAT to buy outright, or £15/month (24-month term), £10/month (36-month term), £10/month (48-month term). Nexgo N86: same pricing as PAX A920 Pro. IM30: £425+VAT to buy outright, or £20/month (24-month term), £12/month (36-month term), £10/month (48-month term).",
    hardwareTiers: [
      {
        device: "PAX A920 Pro",
        tiers: [
          { label: "Buy outright", price: "£325+VAT" },
          { label: "24-month term", price: "£15/month" },
          { label: "36-month term", price: "£10/month" },
          { label: "48-month term", price: "£10/month" },
        ],
      },
      {
        device: "Nexgo N86",
        tiers: [
          { label: "Buy outright", price: "£325+VAT" },
          { label: "24-month term", price: "£15/month" },
          { label: "36-month term", price: "£10/month" },
          { label: "48-month term", price: "£10/month" },
        ],
        note: "Same pricing as PAX A920 Pro.",
      },
      {
        device: "IM30",
        tiers: [
          { label: "Buy outright", price: "£425+VAT" },
          { label: "24-month term", price: "£20/month" },
          { label: "36-month term", price: "£12/month" },
          { label: "48-month term", price: "£10/month" },
        ],
      },
    ],
    setupFeeText:
      "One-off setup/installation fee is deducted from Net Recurring Revenue before commission is calculated — amount not stated.",
    earlyTerminationFeeText: null,
    upfrontCommissionText: null,
    residualText: "30% of Net Recurring Revenue.",
    residualBasisText:
      "Margin (Qualified Revenue less Base Fees/interchange and the DNAP Processing Fee, less one-off setup fees).",
    residualDurationText:
      "Ongoing monthly for life of the merchant contract; post-termination continues until the contract ends or Introducer Commission falls below £100/month, whichever first.",
    paymentTermsText:
      "Monthly — DNA publishes a statement within 10 business days of month-end, pays within 10 business days of that.",
    clawbackText:
      "None for chargebacks, refunds or 'Non-Controllable Costs' (explicitly excluded). Separate penalty if you breach non-solicitation, owed by you to DNA, not a clawback of your commission.",
  },
  {
    partner: "Epos Now",
    hasData: true,
    pricingModel:
      "Blended — you choose which of two fixed rates to quote per merchant. Commission is tied to the choice: the lower rate favours the merchant, the higher rate favours your commission.",
    cpRateText: "1% blended (maximises customer saving) or 1.5% blended (maximises commission) — your choice.",
    cnpRateText: "Same blended rate as CP — Epos Now doesn't publish a separate CNP rate.",
    volumeTiersText: null,
    authFeeText: null,
    pciFeeText: null,
    mmscText:
      "Support & Care plan (excl. VAT): Standard £39/month or Premium £49/month (additional plans get a £10/month discount).",
    terminalCostText:
      "Payments Hardware (excl. VAT, no contract length stated): Link £15/month, Air £19/month, Pro £20/month, Pro+ £45/month.",
    hardwareTiers: [
      {
        device: "Payments Hardware",
        tiers: [
          { label: "Link", price: "£15/month" },
          { label: "Air", price: "£19/month" },
          { label: "Pro", price: "£20/month" },
          { label: "Pro+", price: "£45/month" },
        ],
        note: "Excl. VAT; no contract length stated.",
      },
    ],
    setupFeeText: null,
    earlyTerminationFeeText: null,
    upfrontCommissionText:
      "£350 Payments bounty when quoting the 1.5% blended rate. Quoting the 1% blended rate (max customer saving) earns a lower bounty — exact figure not stated.",
    residualText: "Tier-based; only Platinum is quantified: 50% of net acquiring revenue. Other tier percentages not stated.",
    residualBasisText: "Margin (net acquiring revenue).",
    residualDurationText:
      "Starts once the merchant hits 45 days' processing + 100 transactions. Standard tiers capped at 24 months; top tiers (e.g. Platinum) unlimited.",
    paymentTermsText:
      "Paid monthly, in arrears. The £350 bounty is released in two 50% stages: Stage 1 on go-live + 50 transactions, Stage 2 on 45 days' processing + 100 transactions.",
    clawbackText: null,
  },
  {
    partner: "Shift4",
    hasData: true,
    pricingModel:
      "Blended, single-rate model for all UK-issued cards. IC++/split pricing is also available as an alternative to blended, but incurs a per-transaction authorisation fee not specified in the source.",
    cpRateText:
      "10k+/month turnover: negotiable down to 0.5% debit / 0.6% credit per your direct negotiated terms; 0.7% blended is the standard headline rate. Under 10k/month turnover: 1.25% blended minimum (hard floor). AMEX flat 1.9% regardless of tier.",
    cnpRateText: "1.99% flat rate — not shown as varying by turnover tier in the source.",
    volumeTiersText:
      "Two turnover tiers, both for the Shift4 One standalone card reader: (1) 10k+/month card turnover; (2) under 10k/month.",
    authFeeText: "0p under blended/flat-rate pricing; IC++/split pricing carries an authorisation fee not specified in the source.",
    pciFeeText: "£0 / €0.",
    mmscText: "£0 / €0.",
    terminalCostText:
      "Shift4 One standalone card reader: free, no monthly rental, for the first terminal on businesses with £10k+/month card turnover; £12/month for any additional terminal on those merchants; £12/month for the first terminal on businesses under £10k/month turnover. Standard contract term is 18 months.",
    hardwareTiers: [
      {
        device: "Shift4 One (standalone card reader)",
        tiers: [
          { label: "First terminal (≥£10k/month turnover)", price: "Free" },
          { label: "Additional terminal (≥£10k/month turnover)", price: "£12/month" },
          { label: "First terminal (under £10k/month turnover)", price: "£12/month" },
        ],
        note: "Standard contract term 18 months.",
      },
    ],
    setupFeeText: "None - confirmed no onboarding/setup fee.",
    earlyTerminationFeeText: null,
    upfrontCommissionText:
      "£500 gross per activation.",
    residualText: "50% residual to you. Plus a one-off bonus in week 14 equal to 14x that week's residual payment.",
    residualBasisText: "Not specified - confirm with Shift4 whether the 50% residual is calculated on turnover or margin.",
    residualDurationText: "Not specified beyond the week 14 bonus mechanic.",
    paymentTermsText:
      "Week 14 bonus: you receive a one-off payment equal to 14x that week's residual. Standard residual payment frequency not otherwise specified.",
    clawbackText: "Not specified.",
  },
  {
    partner: "Teya",
    hasData: true,
    pricingModel:
      "Blended and unblended (IC++/split) both available. Merchant is not on one fixed rate — it's calculated per-merchant via Teya's own pricing calculator/quote tool.",
    cpRateText:
      "No confirmed public or negotiated rate on file — Teya prices per-merchant via its own pricing calculator. Check Teya's pricing calculator before quoting.",
    cnpRateText: "Same calculator-driven pricing as CP — no separate published CNP rate found.",
    volumeTiersText:
      "No public rate bands on file — pricing is quoted per-merchant via Teya's calculator, not published tiers.",
    authFeeText: "None found on Teya's published Fees page for card-present transactions.",
    pciFeeText: "Not listed as a separate fee on Teya's published Fees page.",
    mmscText: "Not listed as a separate fee on Teya's published Fees page.",
    terminalCostText: "Teya Lite £10/month; PAX A35 £15/month; Teya Pro £25/month.",
    hardwareTiers: [
      { device: "Teya Lite", tiers: [{ label: "Monthly rental", price: "£10/month" }] },
      { device: "PAX A35", tiers: [{ label: "Monthly rental", price: "£15/month" }] },
      { device: "Teya Pro", tiers: [{ label: "Monthly rental", price: "£25/month" }] },
    ],
    setupFeeText: null,
    earlyTerminationFeeText: null,
    upfrontCommissionText:
      "£350 gross per activation.",
    residualText: "50% residual to you.",
    residualBasisText:
      "Not specified in the ISC Agreement itself - confirm with Teya whether the 50% residual is calculated on turnover or margin.",
    residualDurationText:
      "Consultant Fees cease immediately on termination of the ISC Agreement, with no post-termination tail. Either party can terminate at any time.",
    paymentTermsText:
      "Not numerically specified in the ISC Agreement. Fees are paid against invoices to Teya, exclusive of VAT unless a valid VAT invoice is supplied.",
    clawbackText:
      "Teya can claw back fees for suspected fraud or breach of the agreement, chargebacks from knowingly-onboarded fraudulent merchants (full liability), breach of the 12-month post-termination non-compete, or where legally required.",
  },
  {
    // Source: Ignite Commission Brochure 2025 v4 — Clover Flex / Flex Pocket only.
    // Displayed as "Clover" throughout the app per the hardware brand it sells, but this
    // is a separate reseller/ISO relationship (Ignite Payments), distinct from any
    // "Clover" ACQUIRER already detected on a statement (that's Fiserv/Clover as the
    // acquiring bank). Watch for this collision: a statement whose acquirerName is
    // "Clover" (Fiserv) will show "Current: Clover" alongside a recommended "Clover"
    // partner card that is a completely different business relationship.
    partner: "Clover",
    hasData: true,
    pricingModel:
      "Blended, band-based (Merchant Pricing Policy) — you set the merchant's rate within a fixed min/max band per card type, not a single negotiated rate. You cannot sell below the minimum or above the maximum.",
    cpRateText:
      "Consumer Debit 0.29%-1.49%; Consumer Credit 0.50%-1.49%; Commercial Debit 1.00%-1.99%; Commercial Credit 1.80%-2.99%; Non-Qualified 0.50% (fixed).",
    cnpRateText: "Same blended bands as CP — Clover's Merchant Pricing Policy doesn't split CP/CNP.",
    volumeTiersText: "No turnover-based volume tiers — the rate is set once per merchant within the fixed min/max band, not banded by turnover.",
    authFeeText: "2p-5p (blended) per transaction.",
    pciFeeText: "n/a on Clover's fee schedule.",
    mmscText: "£0.00-£20 (blended).",
    terminalCostText:
      "Clover Flex: £20/month (36-month term) or £10/month (48-month term) to the merchant. Clover Flex Pocket: same £20/£10 monthly bands by term. A 6-month 'Step-Up' promo is available on both — £1/month for the first 6 months, then reverting to the sold rate.",
    hardwareTiers: [
      {
        device: "Clover Flex",
        tiers: [
          { label: "36 months", price: "£20/month" },
          { label: "48 months", price: "£10/month" },
        ],
        note: "Step-Up offer: £1/month for the first 6 months, then reverting to the sold rate.",
      },
      {
        device: "Clover Flex Pocket",
        tiers: [
          { label: "36 months", price: "£20/month" },
          { label: "48 months", price: "£10/month" },
        ],
        note: "Step-Up offer: £1/month for the first 6 months, then reverting to the sold rate.",
      },
    ],
    setupFeeText: null,
    earlyTerminationFeeText: null,
    upfrontCommissionText:
      "Clover Flex: £400/device (36-month term) or £200/device (48-month term). Clover Flex Pocket: £140/device (36-month term) or £280/device (48-month term). Paid weekly, only once the MID is live.",
    residualText: "40% residual monthly above Interchange and Scheme fees (blended pricing).",
    residualBasisText: "Margin — above Interchange and Scheme fees, not turnover.",
    residualDurationText:
      "Ongoing monthly, but only in months where the qualification criteria is met: 1+ new live MID per calendar month across your whole Clover relationship (not per-merchant). A MID must go live the day before month-end to count for that month; if it goes live on the last day of the month, it counts for the following month instead.",
    paymentTermsText:
      "Weekly commission (device sales) paid Mondays in arrears, once the MID is live. Residual commission paid monthly in arrears, before the last Friday of the following month.",
    clawbackText:
      "Applies if the merchant doesn't complete 12 monthly payments of their service contract — deducted from Clover device commission, Virtual Terminal/eCommerce commission, or residual commission.",
  },
  { partner: "Konect", hasData: false, pricingModel: null, cpRateText: null, cnpRateText: null, volumeTiersText: null, authFeeText: null, pciFeeText: null, mmscText: null, terminalCostText: null, setupFeeText: null, earlyTerminationFeeText: null, upfrontCommissionText: null, residualText: null, residualBasisText: null, residualDurationText: null, paymentTermsText: null, clawbackText: null },
  { partner: "Dojo", hasData: false, pricingModel: null, cpRateText: null, cnpRateText: null, volumeTiersText: null, authFeeText: null, pciFeeText: null, mmscText: null, terminalCostText: null, setupFeeText: null, earlyTerminationFeeText: null, upfrontCommissionText: null, residualText: null, residualBasisText: null, residualDurationText: null, paymentTermsText: null, clawbackText: null },
  { partner: "Sumup", hasData: false, pricingModel: null, cpRateText: null, cnpRateText: null, volumeTiersText: null, authFeeText: null, pciFeeText: null, mmscText: null, terminalCostText: null, setupFeeText: null, earlyTerminationFeeText: null, upfrontCommissionText: null, residualText: null, residualBasisText: null, residualDurationText: null, paymentTermsText: null, clawbackText: null },
  { partner: "Paya Group", hasData: false, pricingModel: null, cpRateText: null, cnpRateText: null, volumeTiersText: null, authFeeText: null, pciFeeText: null, mmscText: null, terminalCostText: null, setupFeeText: null, earlyTerminationFeeText: null, upfrontCommissionText: null, residualText: null, residualBasisText: null, residualDurationText: null, paymentTermsText: null, clawbackText: null },
  { partner: "Modern World", hasData: false, pricingModel: null, cpRateText: null, cnpRateText: null, volumeTiersText: null, authFeeText: null, pciFeeText: null, mmscText: null, terminalCostText: null, setupFeeText: null, earlyTerminationFeeText: null, upfrontCommissionText: null, residualText: null, residualBasisText: null, residualDurationText: null, paymentTermsText: null, clawbackText: null },
];

export const RANKABLE_PARTNERS = ["myPOS", "DNA Payments", "Shift4", "Teya", "Epos Now", "Clover"] as const;
export const OTHER_OPTION_PARTNERS = ["Konect", "Dojo", "Sumup", "Paya Group", "Modern World"] as const;

/** Partner portal URLs for login / quoting / pricing calculations — not all rankable partners have one on file yet. */
export const PARTNER_PORTAL_LINKS: Record<string, string> = {
  myPOS: "https://das.mypos.com/login",
  "Epos Now": "https://eposnow.referralrock.com/l/1MARTHAGARB62/",
  "DNA Payments": "https://dnapayments.com/about/partners-form-the-mars-perspective-ltd",
  Teya: "https://partner.teya.com",
  Shift4:
    "https://link.shift4payments.com/auth/login?role=salesRepresentative&redirectUrl=https%3A%2F%2Fapi.dealer-portal.shift4.com%2Fapi%2Fauth%2Flink%3Fredirect%3Dhttps%253A%252F%252Fpartner-portal.shift4.com%252F&application=partner+portal",
  // Portal URL is Ignite Payments' real boarding system — unrelated to the "Clover" display name.
  Clover: "https://boarding.ignitepayments.co.uk/login/login",
};
