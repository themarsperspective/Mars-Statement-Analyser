// DNA Payments rate matrix — replaces the old F2F/Online/CNP × Debit/Credit/Premium
// Credit structure entirely. Single source of truth for both the calculation in
// ranking.ts and the full band-table display in ProviderCompareList.tsx.
export interface DnaRateBand {
  label: string;
  minTurnover: number;
  maxTurnover: number | null;
  debit: number;
  credit: number;
  businessDebit: number;
  businessCredit: number;
  onlineDebit: number;
  onlineCredit: number;
  authFeePence: number;
}

export const DNA_GATEWAY_FEE_TEXT = "£0.10/month (flat, all bands)";
export const DNA_PCI_FEE_TEXT = "£0 (flat, all bands)";

export const DNA_RATE_BANDS: DnaRateBand[] = [
  { label: "£0 (NTC)", minTurnover: 0, maxTurnover: 0, debit: 0.5, credit: 1.0, businessDebit: 2.0, businessCredit: 2.8, onlineDebit: 0.65, onlineCredit: 1.15, authFeePence: 5 },
  { label: "£1–£50,000", minTurnover: 1, maxTurnover: 50000, debit: 0.5, credit: 1.0, businessDebit: 1.8, businessCredit: 2.8, onlineDebit: 0.65, onlineCredit: 1.15, authFeePence: 5 },
  { label: "£50,001–£100,000", minTurnover: 50001, maxTurnover: 100000, debit: 0.45, credit: 0.8, businessDebit: 1.7, businessCredit: 2.6, onlineDebit: 0.6, onlineCredit: 0.95, authFeePence: 3 },
  { label: "£100,001–£200,000", minTurnover: 100001, maxTurnover: 200000, debit: 0.4, credit: 0.75, businessDebit: 1.6, businessCredit: 2.4, onlineDebit: 0.55, onlineCredit: 0.9, authFeePence: 3 },
  { label: "£200,001–£300,000", minTurnover: 200001, maxTurnover: 300000, debit: 0.35, credit: 0.65, businessDebit: 1.55, businessCredit: 2.2, onlineDebit: 0.5, onlineCredit: 0.8, authFeePence: 3 },
  { label: "£300,001–£400,000", minTurnover: 300001, maxTurnover: 400000, debit: 0.32, credit: 0.62, businessDebit: 1.5, businessCredit: 2.0, onlineDebit: 0.47, onlineCredit: 0.77, authFeePence: 3 },
  { label: "£400,001–£500,000", minTurnover: 400001, maxTurnover: 500000, debit: 0.3, credit: 0.6, businessDebit: 1.4, businessCredit: 1.95, onlineDebit: 0.45, onlineCredit: 0.75, authFeePence: 2 },
  { label: "£500,001–£750,000", minTurnover: 500001, maxTurnover: 750000, debit: 0.3, credit: 0.55, businessDebit: 1.3, businessCredit: 1.9, onlineDebit: 0.45, onlineCredit: 0.7, authFeePence: 2 },
  { label: "£750,001–£1,000,000", minTurnover: 750001, maxTurnover: 1000000, debit: 0.29, credit: 0.5, businessDebit: 1.25, businessCredit: 1.8, onlineDebit: 0.4, onlineCredit: 0.65, authFeePence: 2 },
  { label: "£1,000,001+", minTurnover: 1000001, maxTurnover: null, debit: 0.29, credit: 0.5, businessDebit: 1.2, businessCredit: 1.75, onlineDebit: 0.4, onlineCredit: 0.65, authFeePence: 2 },
];

export function dnaBandFor(turnover: number): DnaRateBand | null {
  return DNA_RATE_BANDS.find((b) => turnover >= b.minTurnover && (b.maxTurnover === null || turnover <= b.maxTurnover)) ?? null;
}
