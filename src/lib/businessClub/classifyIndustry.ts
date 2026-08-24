import { ExtractedData, NOT_STATED } from "../types";
import { IndustryClassification } from "./types";

// Standard (ISO 18245) UK-relevant MCC codes mapped to the config's industry
// categories. Only codes with a clean, confident match are listed — anything
// not here falls through to the business-name keyword match, then to
// "Other / Unclassified".
const MCC_TO_INDUSTRY: Record<string, string> = {
  "5812": "Restaurant",
  "5811": "Restaurant",
  "5814": "Takeaway / QSR",
  "5813": "Pub / Bar",
  "5462": "Café / Coffee Shop",
  "5411": "Convenience / Grocery Store",
  "5499": "Convenience / Grocery Store",
  "5661": "Fashion / Boutique Retail",
  "5651": "Fashion / Boutique Retail",
  "5691": "Fashion / Boutique Retail",
  "5621": "Fashion / Boutique Retail",
  "5311": "General Retail",
  "5399": "General Retail",
  "5732": "General Retail",
  "5200": "General Retail",
  "5231": "General Retail",
  "5122": "General Retail",
  "5192": "General Retail",
  "7230": "Salon / Barber / Beauty",
  "7298": "Spa / Wellness Clinic",
  "7991": "Entertainment / Events Venue",
  "7996": "Entertainment / Events Venue",
  "7997": "Gym / Fitness / Leisure",
  "7941": "Gym / Fitness / Leisure",
  "7992": "Gym / Fitness / Leisure",
  "7011": "Hotel / Accommodation",
  "8011": "Dental / Medical / Private Clinic",
  "8021": "Dental / Medical / Private Clinic",
  "8099": "Dental / Medical / Private Clinic",
  "8062": "Dental / Medical / Private Clinic",
  "8050": "Care Home / Residential Care",
  "8351": "Nursery / Childcare",
  "8211": "Education / Training Centre",
  "8220": "Education / Training Centre",
  "8299": "Education / Training Centre",
  "7538": "Garage / MOT / Vehicle Repair",
  "7534": "Garage / MOT / Vehicle Repair",
  "5511": "Car Dealership",
  "5521": "Car Dealership",
  "1520": "Construction Company",
  "1711": "Trades / Contractor",
  "1731": "Trades / Contractor",
  "1740": "Trades / Contractor",
  "1750": "Trades / Contractor",
  "1761": "Trades / Contractor",
  "1799": "Trades / Contractor",
  "4121": "Transport / Logistics",
  "4214": "Transport / Logistics",
  "4789": "Transport / Logistics",
  "8111": "Accountancy / Legal / Consultancy",
  "8931": "Accountancy / Legal / Consultancy",
  "7392": "Professional Services",
  "8742": "Professional Services",
  "5964": "E-commerce / Online Retailer",
  "5968": "E-commerce / Online Retailer",
  "5969": "E-commerce / Online Retailer",
  "5065": "Wholesale / Distribution",
  "5099": "Wholesale / Distribution",
  "5085": "Wholesale / Distribution",
  // Builders' merchants/timber yards trade heavily with contractors on
  // account/bulk terms rather than counter retail — confirmed against real
  // data: North London Timber (MCC 5211) averaged £3,439/transaction across
  // only 103 transactions in the month, a bulk/trade pattern, not retail
  // foot traffic.
  "5211": "Wholesale / Distribution",
  "8641": "Charity / NFP premises-based",
  "8398": "Charity / NFP premises-based",
};

// Business-name keyword fallback, most-specific-first so overlapping words
// (e.g. "inn" appearing in both pub and hotel names) resolve sensibly.
const NAME_KEYWORD_RULES: { re: RegExp; industry: string }[] = [
  { re: /\b(hotel|guest\s*house|b\s*&\s*b|bed\s*and\s*breakfast)\b/i, industry: "Hotel / Accommodation" },
  { re: /\b(pub|inn|tavern|alehouse)\b/i, industry: "Pub / Bar" },
  { re: /\b(take\s*-?away|fish\s*(and|&)\s*chips|kebab|pizza)\b/i, industry: "Takeaway / QSR" },
  { re: /\b(caf[eé]|coffee)\b/i, industry: "Café / Coffee Shop" },
  { re: /\brestaurant|bistro|trattoria|brasserie\b/i, industry: "Restaurant" },
  { re: /\bcare\s*home|residential\s*care|nursing\s*home\b/i, industry: "Care Home / Residential Care" },
  { re: /\bdomiciliary|home\s*care\b/i, industry: "Domiciliary Care Agency" },
  { re: /\b(convenience\s*store|newsagent|off[\s-]?licen[cs]e)\b/i, industry: "Convenience / Grocery Store" },
  { re: /\bsalon|barber|hairdress|beauty\b/i, industry: "Salon / Barber / Beauty" },
  { re: /\bspa|wellness\b/i, industry: "Spa / Wellness Clinic" },
  { re: /\bgym|fitness|leisure\s*centre\b/i, industry: "Gym / Fitness / Leisure" },
  { re: /\bgarage|\bmot\b|tyres?|vehicle\s*repair\b/i, industry: "Garage / MOT / Vehicle Repair" },
  { re: /\bmotors?\b|car\s*sales|dealership\b/i, industry: "Car Dealership" },
  { re: /\bconstruction\b/i, industry: "Construction Company" },
  { re: /\bplumb|electrician|roofing|builders?\b/i, industry: "Trades / Contractor" },
  { re: /\blogistics|haulage|couriers?|freight\b/i, industry: "Transport / Logistics" },
  { re: /\baccountant|solicitors?|law\s*firm|legal\b/i, industry: "Accountancy / Legal / Consultancy" },
  { re: /\bconsult|advisory\b/i, industry: "Professional Services" },
  { re: /\bdental|dentist|clinic|medical\b/i, industry: "Dental / Medical / Private Clinic" },
  { re: /\bnursery|childcare|kindergarten\b/i, industry: "Nursery / Childcare" },
  { re: /\btraining|academy|college|school\b/i, industry: "Education / Training Centre" },
  { re: /\bwholesale|distribution\b/i, industry: "Wholesale / Distribution" },
  { re: /\bmanufactur\w*\b/i, industry: "Manufacturing" },
  { re: /\bevents?\s*venue|entertainment\b/i, industry: "Entertainment / Events Venue" },
  { re: /\bcharity|foundation\b/i, industry: "Charity / NFP premises-based" },
  { re: /\bboutique|fashion|clothing\b/i, industry: "Fashion / Boutique Retail" },
  { re: /\bonline|e-?commerce\b/i, industry: "E-commerce / Online Retailer" },
  { re: /\bshop|store|retail\b/i, industry: "General Retail" },
];

export function classifyIndustry(data: ExtractedData): IndustryClassification {
  if (data.mcc && data.mcc !== NOT_STATED) {
    const industry = MCC_TO_INDUSTRY[data.mcc.trim()];
    if (industry) {
      return { industry, confidence: "high", basis: `Merchant Category Code ${data.mcc}` };
    }
  }

  const name = data.merchantName ?? "";
  for (const { re, industry } of NAME_KEYWORD_RULES) {
    if (re.test(name)) {
      return { industry, confidence: "medium", basis: `business name matched "${name}"` };
    }
  }

  return {
    industry: "Other / Unclassified",
    confidence: "low",
    basis: "no reliable MCC or business-name signal — defaulted",
  };
}
