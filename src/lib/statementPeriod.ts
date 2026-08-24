// Some statements (seen on Teya's daily "Settlement Report" layout, as
// opposed to its monthly "Settlement Report <Month> <Year>" layout) cover a
// single calendar day rather than a full month — e.g. period "Feb 5, 2026"
// rather than "January 2026" or a date range like "01 Nov 2025 - 30 Nov
// 2025". A single day's turnover can't stand in for monthly turnover, so
// partners whose pricing is gated on a monthly volume threshold (Shift4's
// £10k/month tier, DNA's monthly turnover bands) must not use it directly.
export function isSingleDayPeriod(period: string | null): boolean {
  if (!period) return false;
  const trimmed = period.trim();

  // A date range covers more than one day.
  if (/\bto\b/i.test(trimmed)) return false;
  if (/\d{4}\s*[-–—]\s*\d{1,2}/.test(trimmed)) return false;

  // A bare month + year with no day number covers a full month.
  const bareMonthYearRe =
    /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}$/i;
  if (bareMonthYearRe.test(trimmed)) return false;

  // Otherwise, a month name/number alongside a day number means the period
  // is anchored to one specific calendar day.
  const monthDayRe =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b/i;
  const dayMonthRe =
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  return monthDayRe.test(trimmed) || dayMonthRe.test(trimmed);
}

export const SINGLE_DAY_NOTICE =
  "This statement covers a single day, not a full month — turnover and transaction figures reflect one day's sales. Volume-tiered partners (e.g. Shift4, DNA) can't be accurately assessed from a single day's figures; upload a full monthly statement for those.";
