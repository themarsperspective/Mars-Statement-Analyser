import { parseCsv } from "./csv";
import {
  emptyExtractedData,
  ExtractedData,
  FeeItem,
  NOT_STATED,
  RateCardItem,
  SchemeRate,
} from "./types";

const KNOWN_ACQUIRERS = [
  "Teya", "Clover", "Worldpay", "Barclaycard", "Elavon", "Global Payments", "Adyen", "Stripe",
  "Square", "SumUp", "Dojo", "Paymentsense", "Handepay", "Takepayments", "Valitor", "Fiserv",
  "First Data", "Lloyds Cardnet", "Cardnet", "NatWest Streamline", "Streamline", "EVO Payments",
  "Nexi", "Verifone", "Ingenico", "DNA Payments", "myPOS", "Zettle", "Trust Payments", "Optomany",
  "Judopay", "Opayo", "Sage Pay", "WorldNet", "Six Payment Services", "Tyl", "NMI",
  "Merchant Savvy", "PayPoint", "Global Payment",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNumber(str: string | undefined | null): number | null {
  if (!str) return null;
  const match = str.match(/-?\d[\d,]*\.?\d*/);
  if (!match) return null;
  const cleaned = match[0].replace(/,/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/[:\-–]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Merchant name: use the address block near the top of page 1 only. Never
// scan the whole document, so footer/registration/legal text can't win.
// ---------------------------------------------------------------------------

const ADDRESS_KEYWORD_RE =
  /\b(road|street|avenue|lane|drive|way|close|court|place|arcade|house|floor|office|building|estate|park)\b/i;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/;
const STREET_NUMBER_RE = /^\d+[a-zA-Z]?\s+\S/;
const STOP_LABEL_RE =
  /^(page\s+\d|statement\s*period|merchant\s*number|customer\s*service|vat\s*registration|contract\s*no|settlement\s*report|report\s*created|currency\s*:?|bank\s*account|sort\s*code|account\s*number)/i;
const TITLE_NOISE_RE = /\b(statement|report|invoice)\b/i;
const LEGAL_SUFFIX_RE = /\b(ltd|limited|llp|plc|llc|inc)\b\.?/i;

export function extractMerchantName(headerLines: string[]): string | null {
  const candidates: string[] = [];
  for (const raw of headerLines.slice(0, 12)) {
    const line = raw.trim();
    if (!line) continue;
    if (STOP_LABEL_RE.test(line)) break;
    if (ADDRESS_KEYWORD_RE.test(line) || UK_POSTCODE_RE.test(line) || STREET_NUMBER_RE.test(line)) break;
    if (TITLE_NOISE_RE.test(line) && !LEGAL_SUFFIX_RE.test(line)) continue;
    candidates.push(line);
    if (candidates.length >= 4) break;
  }
  if (candidates.length === 0) return null;
  const withSuffix = candidates.find((c) => LEGAL_SUFFIX_RE.test(c));
  if (withSuffix) return withSuffix;
  return candidates.reduce((longest, c) => (c.length > longest.length ? c : longest), candidates[0]);
}

// ---------------------------------------------------------------------------
// Acquirer / provider: earliest mention of a known brand anywhere in the doc.
// ---------------------------------------------------------------------------

function findAcquirer(fullText: string): string | null {
  let bestIndex = Infinity;
  let bestBrand: string | null = null;
  for (const brand of KNOWN_ACQUIRERS) {
    const re = new RegExp(`\\b${escapeRegex(brand)}\\b`, "i");
    const match = re.exec(fullText);
    if (match && match.index < bestIndex) {
      bestIndex = match.index;
      bestBrand = brand;
    }
  }
  return bestBrand;
}

// ---------------------------------------------------------------------------
// Statement period
// ---------------------------------------------------------------------------

function extractStatementPeriod(lines: string[], fullText: string): string | null {
  const labelRe = /statement\s*period|billing\s*period|for\s+the\s+period|period\s*covered/i;
  for (let i = 0; i < lines.length; i++) {
    const m = labelRe.exec(lines[i]);
    if (!m) continue;
    let value = lines[i].slice(m.index + m[0].length).replace(/^[\s:\-–]+/, "").trim();
    if (!value && lines[i + 1]) value = lines[i + 1].trim();
    if (value) return value;
  }
  // "01 May 2026 to 31 May 2026" — a full date-range stated without a
  // "Statement period" label, just placed under the merchant name.
  const dateRangeRe = /\b\d{1,2}\s+\w+\s+\d{4}\s+to\s+\d{1,2}\s+\w+\s+\d{4}\b/i;
  const dateRangeMatch = fullText.match(dateRangeRe);
  if (dateRangeMatch) return dateRangeMatch[0];
  const monthYearRe =
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i;
  const monthYearMatch = fullText.match(monthYearRe);
  if (monthYearMatch) return monthYearMatch[0];
  const fullDateRe =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i;
  const fullDateMatch = fullText.match(fullDateRe);
  if (fullDateMatch) return fullDateMatch[0];
  return null;
}

// ---------------------------------------------------------------------------
// MCC: matched across the whole text (not line-by-line) so a label that wraps
// across a line break, e.g. "merchant category\ncode (MCC)", still matches.
// ---------------------------------------------------------------------------

function extractMcc(fullText: string): string {
  const re = /merchant\s*category\s*code|\bmcc\b/i;
  const match = re.exec(fullText);
  if (!match) return NOT_STATED;
  const window = fullText.slice(match.index, match.index + 60);
  const codeMatch = window.match(/\b\d{4}\b/);
  return codeMatch ? codeMatch[0] : NOT_STATED;
}

// ---------------------------------------------------------------------------
// Turnover / transaction count / average value.
//
// Tier 1 (primary): find a table header row naming a count column
// (Transactions/Items/#/Qty) and an amount column (Sales/Amount/Value/
// Turnover), then read the first two numbers off the "Total" row that
// follows it. This works across very different statement layouts because it
// keys off column *meaning*, not a fixed heading phrase, and it structurally
// ignores adjustment/refund rows since those live in separate table columns.
//
// Tier 2 (fallback): a single clearly-labelled "Total turnover"-style line,
// for simple statements with no table at all.
// ---------------------------------------------------------------------------

const TABLE_HEADER_RE =
  /^(?=.*(?:\btransactions?\b|\bitems?\b|#|\bqty\b))(?=.*\b(?:sales|amount|value|turnover)\b)(?!.*\byou r?\b)(?!.*\b\d{1,2}\s*months?\b)(?!.*[£$€])(?!.*\d).{0,80}$/i;

function parseLabelledNumberRow(line: string): { label: string; numbers: number[] } | null {
  const tokens = line.trim().split(/\s+/);
  const numTokenRe = /^-?\d[\d,]*\.?\d*$/;
  const splitIdx = tokens.findIndex((t) => numTokenRe.test(t));
  if (splitIdx === -1) return null;
  const label = tokens.slice(0, splitIdx).join(" ");
  const numbers = tokens
    .slice(splitIdx)
    .filter((t) => numTokenRe.test(t))
    .map((t) => parseFloat(t.replace(/,/g, "")));
  return { label, numbers };
}

function findTableTotals(lines: string[]): { count: number; amount: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 80) continue;
    if (!TABLE_HEADER_RE.test(line)) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 60); j++) {
      const candidate = lines[j].trim();
      if (!/^total\b/i.test(candidate)) continue;
      const parsed = parseLabelledNumberRow(candidate);
      if (parsed && parsed.numbers.length >= 2) {
        let [a, b] = parsed.numbers;
        if (Math.abs(a - Math.round(a)) > 0.001 && Math.abs(b - Math.round(b)) < 0.001) {
          [a, b] = [b, a];
        }
        return { count: Math.round(a), amount: b };
      }
      break;
    }
  }
  return null;
}

function extractSimpleTotalsFallback(lines: string[]): { count: number; amount: number } | null {
  let amount: number | null = null;
  let count: number | null = null;
  const turnoverRe =
    /total\s*(card\s*)?turnover|total\s*amount\s*submitted|total\s*sales\s*(value|volume)?|gross\s*turnover/i;
  const countRe = /total\s*(number\s*of\s*)?transactions|transaction\s*count|no\.?\s*of\s*transactions|number\s*of\s*sales/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b\d{1,2}\s*months?\b/i.test(line)) continue;
    if (amount === null && turnoverRe.test(line)) {
      const n = extractNumber(line) ?? extractNumber(lines[i + 1]);
      if (n !== null) amount = n;
    }
    if (count === null && countRe.test(line)) {
      const n = extractNumber(line) ?? extractNumber(lines[i + 1]);
      if (n !== null) count = n;
    }
  }
  if (amount === null || count === null) return null;
  return { count: Math.round(count), amount };
}

// Tier 0 (tried before both tiers above): some layouts (seen on Worldpay
// statements) lay out a "Cards Acquired" ledger as one row per card
// type/scheme ("Purchases 114 2,610.75 0.80900% 21.13 EMasterCard Cr Per"),
// with a per-card-type "Total" sub-row, and a final grand-"Total" row whose
// three numbers are concatenated with no separating whitespace in the PDF's
// text layer (e.g. "Total 270.8843,378.371884" = charge 270.88, value
// 43,378.37, count 1884) — too ambiguous to parse directly. Instead, sum the
// count/value straight off each "Purchases"/"Refunds" row, which are
// reliably space-separated.
function parseCardsAcquiredRow(line: string): { count: number; value: number } | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "Purchases" && tokens[0] !== "Refunds") return null;
  const count = parseInt((tokens[1] || "").replace(/,/g, ""), 10);
  if (Number.isNaN(count)) return null;
  // Numeric-looking tokens between the count and the trailing VAT-code +
  // card-type name (which starts with a letter, e.g. "EMasterCard Cr Per").
  const rest: string[] = [];
  for (let i = 2; i < tokens.length; i++) {
    if (/^[A-Za-z]/.test(tokens[i])) break;
    rest.push(tokens[i]);
  }
  // Purchase rows: [value, rate%, charge] — value sits just before the "%" token.
  // Refund rows (no "%", a flat per-transaction charge instead): [chargePerTxn, value, charge].
  const pctIdx = rest.findIndex((t) => t.includes("%"));
  const valueToken = pctIdx !== -1 ? rest[pctIdx - 1] : rest[1];
  if (valueToken === undefined) return null;
  const value = parseFloat(valueToken.replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  return { count, value };
}

const CARDS_ACQUIRED_BOUNDARY_RE =
  /^(premium\s+charges|miscellaneous\s+charges|cards\s+processed\s+for\s+other\s+acquirers)\b/i;

function extractCardsAcquiredRowTotals(lines: string[]): { count: number; amount: number } | null {
  const startIdx = lines.findIndex((l) => /^cards\s+acquired\b/i.test(l.trim()));
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (CARDS_ACQUIRED_BOUNDARY_RE.test(lines[i].trim())) {
      endIdx = i;
      break;
    }
  }
  let count = 0;
  let amount = 0;
  let rows = 0;
  for (let i = startIdx + 1; i < endIdx; i++) {
    const row = parseCardsAcquiredRow(lines[i]);
    if (!row) continue;
    count += row.count;
    amount += row.value;
    rows++;
  }
  if (rows === 0) return null;
  return { count, amount: Math.round(amount * 100) / 100 };
}

// ---------------------------------------------------------------------------
// "Charges Summary" category-total table (seen on Worldpay-style
// statements): a short list of named charge categories, each with a stated
// total, ending in a "Total Charges" line. Boilerplate lines in between
// ("THIS IS NOT A VAT INVOICE" etc.) have no trailing amount, so they're
// skipped rather than breaking the scan. Where a category also has its own
// itemised breakdown table elsewhere on the statement (e.g. Miscellaneous
// Charges), the itemised rows are substituted in for that one category so
// real per-item costs are visible without double-counting into the total.
// ---------------------------------------------------------------------------

const CHARGES_SUMMARY_HEADING_RE = /^charges\s+summary\b/i;
const CHARGES_SUMMARY_CATEGORY_RE = /^([a-z][a-z0-9 \-()£]*?)\s+(-?[\d,]+\.\d{2})\s*$/i;

function extractChargesSummary(lines: string[]): FeeItem[] {
  const headingIdx = lines.findIndex((l) => CHARGES_SUMMARY_HEADING_RE.test(l.trim()));
  if (headingIdx === -1) return [];
  const categories: FeeItem[] = [];
  for (let i = headingIdx + 1; i < Math.min(lines.length, headingIdx + 20); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^total\s+charges\b/i.test(line)) break;
    const m = CHARGES_SUMMARY_CATEGORY_RE.exec(line);
    if (!m) continue;
    categories.push({ label: cleanLabel(m[1]), amount: parseFloat(m[2].replace(/,/g, "")) });
  }
  return categories;
}

// Itemised rows under a category's own breakdown table, e.g. Miscellaneous
// Charges: "<label> <count> <rate> <amount> <vat code>" — the trailing
// single-letter VAT code anchors the match so header/column-label lines
// (which have no such trailing code) are safely skipped.
const CATEGORY_ITEM_ROW_RE = /^(.+?)\s+(\d+)\s+([\d.]+)\s+(-?[\d,]+\.\d{2})\s+[A-Z]\s*$/;

function extractCategoryItemisedRows(lines: string[], headingRe: RegExp): FeeItem[] {
  const headingIdx = lines.findIndex((l) => headingRe.test(l.trim()));
  if (headingIdx === -1) return [];
  const items: FeeItem[] = [];
  for (let i = headingIdx + 1; i < Math.min(lines.length, headingIdx + 40); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^total\b/i.test(line)) break;
    const m = CATEGORY_ITEM_ROW_RE.exec(line);
    if (!m) continue;
    items.push({ label: cleanLabel(m[1]), amount: parseFloat(m[4].replace(/,/g, "")) });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Actual charges this period vs. non-fee adjustments.
//
// Tier A (primary): scan for a recognised standalone heading line (FEES,
// SERVICE CHARGES, INTERCHANGE CHARGES, "Fees", etc.) and read labelled rows
// under it until the section's own "Total" line. This works for any label
// text, since the boundary is the section, not a fixed keyword list.
// ADJUSTMENTS / CHARGEBACKS / THIRD PARTY sections are captured the same way
// but routed to otherAdjustments and never counted as fees.
//
// Tier B (fallback, only used if Tier A found nothing at all): a broad scan
// for "<label containing fee/charge/etc> <amount>" lines, for statements
// with no distinct section structure.
// ---------------------------------------------------------------------------

const FEE_SECTION_HEADING_RE =
  /^(fees?|service\s*charges?|interchange\s*charges?|scheme\s*fees?|card\s*fees?|merchant\s*fees?|transaction\s*fees?|charges?)$/i;
const EXCLUDE_SECTION_HEADING_RE =
  /^(adjustments?|chargebacks?\s*\/?\s*reversals?|third\s*party\s*transactions?|refunds?)$/i;

function parseTrailingAmountLine(line: string): { label: string; amount: number } | null {
  const m = line.match(/(-?[\d,]+\.\d{2})\s*$/);
  if (!m || m.index === undefined) return null;
  const amount = parseFloat(m[1].replace(/,/g, ""));
  let label = line.slice(0, m.index).trim();
  label = label.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+/, "");
  label = label.replace(/\s+[\d.]+\s+(?:disc\s+)?rate\s+times\s+[\d,]+\.?\d*\s*$/i, "");
  label = label.replace(/\s+\d+\s+transactions?\s+at\s+[\d.]+\s*$/i, "");
  label = cleanLabel(label);
  if (!label) return null;
  return { label, amount };
}

// A statement sometimes restates the same charge as a positive figure
// elsewhere (e.g. "Fees -5.47" then later "Sales fees 5.47" as an explainer).
// Drop the positive twin so it isn't double-counted into the blended rate.
function dedupeOppositeSignTwins(fees: FeeItem[]): FeeItem[] {
  return fees.filter((fee) => {
    if (fee.amount === null || fee.amount <= 0) return true;
    const key = Math.round(fee.amount * 100);
    return !fees.some((other) => other !== fee && other.amount !== null && Math.round(-other.amount * 100) === key);
  });
}

function mergeFeeItems(fees: FeeItem[]): FeeItem[] {
  const order: string[] = [];
  const totals = new Map<string, number | null>();
  for (const fee of fees) {
    const key = fee.label.toLowerCase();
    if (!totals.has(key)) {
      order.push(key);
      totals.set(key, fee.amount);
    } else {
      const existing = totals.get(key) ?? null;
      const summed =
        existing !== null && fee.amount !== null ? Math.round((existing + fee.amount) * 100) / 100 : (existing ?? fee.amount);
      totals.set(key, summed);
    }
  }
  const labelByKey = new Map<string, string>();
  for (const fee of fees) {
    if (!labelByKey.has(fee.label.toLowerCase())) labelByKey.set(fee.label.toLowerCase(), fee.label);
  }
  return order.map((key) => ({ label: labelByKey.get(key) ?? key, amount: totals.get(key) ?? null }));
}

function extractActualChargesFromSections(lines: string[]): { actualCharges: FeeItem[]; otherAdjustments: FeeItem[] } {
  const actualCharges: FeeItem[] = [];
  const otherAdjustments: FeeItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].trim();
    const isFeeSection = FEE_SECTION_HEADING_RE.test(heading);
    const isExcludedSection = !isFeeSection && EXCLUDE_SECTION_HEADING_RE.test(heading);
    if (!isFeeSection && !isExcludedSection) continue;

    const target = isFeeSection ? actualCharges : otherAdjustments;
    let j = i + 1;
    for (; j < Math.min(lines.length, i + 40); j++) {
      const line = lines[j].trim();
      if (!line) continue;
      if (/^total\b/i.test(line)) {
        j++;
        break;
      }
      if (/^date\s+description/i.test(line)) continue;
      if (/^there\s+are\s+no\b/i.test(line)) continue;
      const parsed = parseTrailingAmountLine(line);
      if (!parsed) {
        if (!/\d/.test(line)) break; // hit a new heading/boundary
        continue;
      }
      target.push(parsed);
    }
    i = j - 1;
  }

  return { actualCharges: mergeFeeItems(actualCharges), otherAdjustments: mergeFeeItems(otherAdjustments) };
}

const FEE_KEYWORD_RE = /\b(fee|charge|surcharge|levy|rental|commission)s?\b/i;

function extractActualChargesFallback(lines: string[]): FeeItem[] {
  const fees: FeeItem[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !FEE_KEYWORD_RE.test(trimmed)) continue;
    if (/^total\b/i.test(trimmed)) continue;
    const parsed = parseTrailingAmountLine(trimmed);
    if (!parsed) continue;
    if (parsed.label.length > 60) continue;
    fees.push(parsed);
  }
  return mergeFeeItems(fees);
}

// ---------------------------------------------------------------------------
// Rate card (contracted rates) and stated scheme-level rates. Kept entirely
// separate from actual charges — this is what the merchant is set up to pay,
// not what was actually deducted this period.
// ---------------------------------------------------------------------------

function extractSchemeRates(lines: string[]): SchemeRate[] {
  const schemeRates: SchemeRate[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^pricing$/i.test(lines[i].trim())) continue;
    const next = (lines[i + 1] || "").trim();
    const clauses = next.split(/\s+\/\s+/);
    for (const clause of clauses) {
      const m = clause.match(/^(.+?):\s*([\d.]+)\s*%/);
      if (m) schemeRates.push({ scheme: m[1].trim(), ratePercent: parseFloat(m[2]) });
    }
    if (schemeRates.length > 0) break;
  }
  return schemeRates;
}

const NETWORK_NAMES = ["Mastercard", "Visa", "Amex", "American Express", "Discover", "Diners"];
const TYPE_WORD_RE = /^(Debit|Credit|Business|Consumer|Commercial|Corporate)\d*[a-z]?$/i;
const RATE_TOKEN_RE = /(\d+(?:\.\d+)?%(?:\s*\+\s*\d+(?:\.\d+)?p)?|\d+(?:\.\d+)?p)/gi;

function extractPsrRateCard(lines: string[]): RateCardItem[] {
  const items: RateCardItem[] = [];
  const triggerIdx = lines.findIndex((l) => /costs\s+for\s+accepting\s+common\s+individual\s+card\s+payments/i.test(l));
  if (triggerIdx === -1) return items;

  const windowLines: string[] = [];
  for (let i = triggerIdx; i < Math.min(lines.length, triggerIdx + 40); i++) {
    const line = lines[i];
    if (/^\+/.test(line.trim()) && windowLines.length > 0) {
      windowLines[windowLines.length - 1] += " " + line.trim();
    } else {
      windowLines.push(line);
    }
  }

  let networkLineIdx = -1;
  let networks: string[] = [];
  for (let i = 1; i < Math.min(windowLines.length, 6); i++) {
    const tokens = windowLines[i].trim().split(/\s+/);
    const found = tokens.filter((t) => NETWORK_NAMES.some((n) => n.toLowerCase() === t.toLowerCase()));
    if (found.length >= 2) {
      networkLineIdx = i;
      networks = found;
      break;
    }
  }
  if (networkLineIdx === -1) return items;

  const subHeaderLine = windowLines[networkLineIdx + 1] || "";
  const subTokens = subHeaderLine
    .trim()
    .split(/\s+/)
    .filter((t) => TYPE_WORD_RE.test(t))
    .map((t) => t.replace(/\d+[a-z]?$/i, ""));
  if (subTokens.length === 0 || subTokens.length % networks.length !== 0) return items;
  const typesPerNetwork = subTokens.length / networks.length;
  const columns: string[] = [];
  for (let n = 0; n < networks.length; n++) {
    for (let t = 0; t < typesPerNetwork; t++) {
      columns.push(`${networks[n]} ${subTokens[n * typesPerNetwork + t]}`);
    }
  }

  for (let i = networkLineIdx + 2; i < windowLines.length; i++) {
    const line = windowLines[i].trim();
    if (!line) continue;
    if (/^additional\s+charges|^other\s+potential|^example|^other\s+monthly/i.test(line)) break;
    const rateMatches = [...line.matchAll(RATE_TOKEN_RE)].map((m) => m[0].replace(/\s+/g, " "));
    if (rateMatches.length === 0 || rateMatches.length !== columns.length) continue;
    const firstRateIdx = line.search(RATE_TOKEN_RE);
    const channelLabel = line.slice(0, firstRateIdx).trim().replace(/\d+$/, "");
    if (!channelLabel) continue;
    rateMatches.forEach((rate, idx) => {
      items.push({ label: `${columns[idx]} — ${channelLabel}`, rate });
    });
  }

  return items;
}

function extractFlatRateCardEntries(lines: string[]): RateCardItem[] {
  const items: RateCardItem[] = [];
  const fullText = lines.join("\n");

  const authLine = lines.find((l) => /authorisation\s*fee/i.test(l) && /\d/.test(l));
  if (authLine) {
    const m = authLine.match(/(\d+(?:\.\d+)?p|\d+(?:\.\d+)?%)/i);
    if (m) items.push({ label: "Authorisation fee (per transaction)", rate: m[0] });
  }

  const chargebackLine = lines.find((l) => /chargeback\s*fee/i.test(l));
  if (chargebackLine) {
    const m = chargebackLine.match(/£\s?[\d,]+\.?\d*/);
    if (m) items.push({ label: "Chargeback fee", rate: m[0].replace(/\s+/g, "") });
  }

  const MONTHLY_CHARGE_LABELS: { re: RegExp; label: string }[] = [
    { re: /minimum\s+monthly\s+service\s+charge/i, label: "Minimum monthly service charge (MMSC)" },
    { re: /pci\s+dss\s+service\s+fee/i, label: "PCI DSS service fee" },
    { re: /point-of-sale\s+terminal/i, label: "Point-of-sale terminal (per month)" },
    { re: /gateway\d*\b/i, label: "Gateway fee" },
  ];
  for (const { re, label } of MONTHLY_CHARGE_LABELS) {
    const line = lines.find((l) => re.test(l));
    if (!line) continue;
    const m = line.match(/(£\s?[\d,]+\.?\d*|N\/A)/i);
    if (m && !/n\/a/i.test(m[0])) items.push({ label, rate: m[0].replace(/\s+/g, "") });
  }

  void fullText;
  return items;
}

function extractRateCardAndSchemeRates(lines: string[]): { rateCard: RateCardItem[]; schemeRates: SchemeRate[] } {
  const rateCard = [...extractPsrRateCard(lines), ...extractFlatRateCardEntries(lines)];
  const schemeRates = extractSchemeRates(lines);
  return { rateCard, schemeRates };
}

// ---------------------------------------------------------------------------
// Blended / effective rate: use a stated figure if the statement gives one;
// otherwise always calculate it from actual charges over turnover.
// ---------------------------------------------------------------------------

function extractStatedBlendedRate(fullText: string): number | null {
  const re = /(?:blended|effective)\s*rate\D{0,15}?([\d.]+)\s*%/i;
  const m = re.exec(fullText);
  if (!m) return null;
  const val = parseFloat(m[1]);
  return Number.isNaN(val) ? null : val;
}

// ---------------------------------------------------------------------------
// Core extraction shared by PDF (page-aware) and CSV (flattened) inputs.
// ---------------------------------------------------------------------------

function runExtraction(page1Lines: string[], allLines: string[]): ExtractedData {
  const fullText = allLines.join("\n");
  const data = emptyExtractedData();

  data.merchantName = extractMerchantName(page1Lines);
  data.acquirerName = findAcquirer(fullText);
  data.statementPeriod = extractStatementPeriod(allLines, fullText);
  data.mcc = extractMcc(fullText);

  const totals =
    extractCardsAcquiredRowTotals(allLines) ?? findTableTotals(allLines) ?? extractSimpleTotalsFallback(allLines);
  if (totals) {
    data.totalTurnover = totals.amount;
    data.transactionCount = totals.count;
    data.averageTransactionValue =
      totals.count > 0 ? Math.round((totals.amount / totals.count) * 100) / 100 : null;
  }

  const chargesSummary = extractChargesSummary(allLines);
  if (chargesSummary.length > 0) {
    const miscItems = extractCategoryItemisedRows(allLines, /^miscellaneous\s+charges$/i);
    data.actualCharges = dedupeOppositeSignTwins(
      chargesSummary.flatMap((category) =>
        /^miscellaneous\s+charges/i.test(category.label) && miscItems.length > 0 ? miscItems : [category]
      )
    );
    data.otherAdjustments = [];
  } else {
    const { actualCharges, otherAdjustments } = extractActualChargesFromSections(allLines);
    const resolvedCharges = actualCharges.length > 0 ? actualCharges : extractActualChargesFallback(allLines);
    data.actualCharges = dedupeOppositeSignTwins(resolvedCharges);
    data.otherAdjustments = otherAdjustments;
  }

  const { rateCard, schemeRates } = extractRateCardAndSchemeRates(allLines);
  data.rateCard = rateCard;
  data.schemeRates = schemeRates;

  const statedRate = extractStatedBlendedRate(fullText);
  if (statedRate !== null) {
    data.blendedRate = { value: statedRate, source: "stated" };
  } else if (data.totalTurnover && data.totalTurnover > 0) {
    const totalCharges = data.actualCharges.reduce((sum, f) => sum + Math.abs(f.amount ?? 0), 0);
    data.blendedRate = {
      value: Math.round((totalCharges / data.totalTurnover) * 10000) / 100,
      source: "calculated",
    };
  }

  return data;
}

export function extractFromPageTexts(pageTexts: string[]): ExtractedData {
  const page1Lines = (pageTexts[0] || "").split(/\r?\n/);
  const allLines = pageTexts.join("\n").split(/\r?\n/);
  return runExtraction(page1Lines, allLines);
}

export function extractFromText(text: string): ExtractedData {
  const lines = text.split(/\r?\n/);
  return runExtraction(lines, lines);
}

export function extractFromCsv(text: string): { data: ExtractedData; flattenedText: string } {
  const rows = parseCsv(text).map((r) => r.map((c) => c.trim()));
  const nonEmptyRows = rows.filter((r) => r.some((c) => c.length > 0));

  const flatLines = nonEmptyRows.map((row) => {
    const cells = row.filter((c) => c.length > 0);
    if (cells.length === 2) return `${cells[0]}: ${cells[1]}`;
    return row.join(" ");
  });

  const data = runExtraction(flatLines.slice(0, 15), flatLines);
  return { data, flattenedText: flatLines.join("\n") };
}
