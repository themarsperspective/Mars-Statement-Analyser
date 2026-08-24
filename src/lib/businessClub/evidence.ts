import { ExtractedData } from "../types";
import { isSingleDayPeriod } from "../statementPeriod";

// What we can actually derive from an already-extracted statement today.
// Most of the config's modifiers (terminal count, employee count, sole
// trader status, premises status, multi-site, CNP %, explicit funding/
// equipment need) describe merchant facts that simply don't appear on a
// card statement — so there is no real evidence for them yet, and per the
// "only apply a modifier if there's real evidence for it, don't guess" rule
// they never fire. This is intentional, not an oversight: the modifier
// definitions and conflict-resolution logic in scoring.ts are fully wired
// and ready to fire the moment such evidence becomes available (e.g. a
// manual-entry field, or richer extraction).
export interface Evidence {
  /** One of turnover_50_99k / turnover_100_249k / turnover_250k_plus, or null. */
  turnoverBandModifierId: string | null;
  /** Evidence of an existing EPOS-capable acquirer already in place. */
  existingEposPresent: boolean;
}

// Acquirers in our KNOWN_ACQUIRERS list that are themselves full or
// lightweight EPOS/POS systems, not just payment processing — genuine
// evidence of an existing EPOS presence, not an inference about this
// specific merchant's setup.
const EPOS_CAPABLE_ACQUIRERS = ["Clover", "Square", "SumUp", "Zettle"];

export function gatherEvidence(data: ExtractedData): Evidence {
  let turnoverBandModifierId: string | null = null;
  // A single-day statement's turnover isn't a monthly figure — same bug
  // class as the Shift4/DNA volume-tier fix in ranking.ts, guarded the same way.
  if (data.totalTurnover !== null && !isSingleDayPeriod(data.statementPeriod)) {
    const t = data.totalTurnover;
    if (t >= 250000) turnoverBandModifierId = "turnover_250k_plus";
    else if (t >= 100000) turnoverBandModifierId = "turnover_100_249k";
    else if (t >= 50000) turnoverBandModifierId = "turnover_50_99k";
  }

  const acquirer = (data.acquirerName ?? "").toLowerCase();
  const existingEposPresent = EPOS_CAPABLE_ACQUIRERS.some((a) => acquirer.includes(a.toLowerCase()));

  return { turnoverBandModifierId, existingEposPresent };
}
