import { ExtractedData } from "../types";
import { isSingleDayPeriod } from "../statementPeriod";

// What we can actually derive from an already-extracted statement today.
// Most of the config's modifiers (terminal count, employee count, sole
// trader status, premises status, multi-site, CNP %, explicit funding/
// equipment need) describe merchant facts that simply don't appear on a
// card statement — so there is no real evidence for them yet from a
// statement, and per the "only apply a modifier if there's real evidence
// for it, don't guess" rule they never fire from gatherEvidence(). This is
// intentional, not an oversight: the modifier definitions and
// conflict-resolution logic in scoring.ts are fully wired and ready to fire
// the moment such evidence becomes available — which is exactly what
// gatherManualEvidence() below does, for the manual-entry Business Club
// form (src/components/BusinessClubForm.tsx). Same Evidence shape, same
// scoring.ts modifier-firing loop, just a second way to populate it.
export interface Evidence {
  /** One of turnover_50_99k / turnover_100_249k / turnover_250k_plus, or null. */
  turnoverBandModifierId: string | null;
  /** Evidence of an existing EPOS-capable acquirer already in place. Statement-only signal. */
  existingEposPresent: boolean;
  /** One of epos_3_4_terminals / epos_5plus_terminals, or null. Manual-entry only signal today. */
  terminalCountModifierId: string | null;
  /** One of cnp_10_24 / cnp_25_49 / cnp_50plus / online_only / no_cnp_detected, or null. Manual-entry only today. */
  cnpModifierId: string | null;
  /** One of employees_10plus / employees_25plus / employees_50plus, or null. Manual-entry only today. */
  employeesModifierId: string | null;
  /** Fires sole_trader. Manual-entry only today. */
  soleTrader: boolean;
  /** Fires multi_site_confirmed. Manual-entry only today. */
  multiSiteConfirmed: boolean;
}

function emptyEvidence(): Evidence {
  return {
    turnoverBandModifierId: null,
    existingEposPresent: false,
    terminalCountModifierId: null,
    cnpModifierId: null,
    employeesModifierId: null,
    soleTrader: false,
    multiSiteConfirmed: false,
  };
}

/** Shared by both evidence paths so the £-band thresholds live in exactly one place. */
export function turnoverBandFor(turnover: number): string | null {
  if (turnover >= 250000) return "turnover_250k_plus";
  if (turnover >= 100000) return "turnover_100_249k";
  if (turnover >= 50000) return "turnover_50_99k";
  return null;
}

// Acquirers in our KNOWN_ACQUIRERS list that are themselves full or
// lightweight EPOS/POS systems, not just payment processing — genuine
// evidence of an existing EPOS presence, not an inference about this
// specific merchant's setup.
const EPOS_CAPABLE_ACQUIRERS = ["Clover", "Square", "SumUp", "Zettle"];

export function gatherEvidence(data: ExtractedData): Evidence {
  const evidence = emptyEvidence();

  // A single-day statement's turnover isn't a monthly figure — same bug
  // class as the Shift4/DNA volume-tier fix in ranking.ts, guarded the same way.
  if (data.totalTurnover !== null && !isSingleDayPeriod(data.statementPeriod)) {
    evidence.turnoverBandModifierId = turnoverBandFor(data.totalTurnover);
  }

  const acquirer = (data.acquirerName ?? "").toLowerCase();
  evidence.existingEposPresent = EPOS_CAPABLE_ACQUIRERS.some((a) => acquirer.includes(a.toLowerCase()));

  return evidence;
}

/** Manual-entry inputs from the standalone Business Club form — all optional except industry
 * (handled separately, see classifyIndustry bypass in BusinessClubForm.tsx). Leaving a field
 * blank (undefined/null) means exactly what it means for a statement with no evidence for that
 * fact: the corresponding modifier simply doesn't fire. */
export interface ManualBusinessClubInput {
  monthlyCardTurnover?: number | null;
  terminalCount?: number | null;
  /** 0-100. Explicit 0 fires "no CNP/online activity detected" (E-commerce -10) — distinct from
   * leaving the field blank, which applies no modifier at all. */
  cnpPercent?: number | null;
  employeeCount?: number | null;
  soleTrader?: boolean | null;
  multiSiteConfirmed?: boolean | null;
}

function terminalCountModifierFor(count: number): string | null {
  if (count >= 5) return "epos_5plus_terminals";
  if (count >= 3) return "epos_3_4_terminals";
  return null;
}

function cnpModifierFor(percent: number): string | null {
  if (percent >= 95) return "online_only";
  if (percent >= 50) return "cnp_50plus";
  if (percent >= 25) return "cnp_25_49";
  if (percent >= 10) return "cnp_10_24";
  if (percent === 0) return "no_cnp_detected";
  return null;
}

function employeesModifierFor(count: number): string | null {
  if (count >= 50) return "employees_50plus";
  if (count >= 25) return "employees_25plus";
  if (count >= 10) return "employees_10plus";
  return null;
}

export function gatherManualEvidence(input: ManualBusinessClubInput): Evidence {
  const evidence = emptyEvidence();

  if (input.monthlyCardTurnover != null) {
    evidence.turnoverBandModifierId = turnoverBandFor(input.monthlyCardTurnover);
  }
  if (input.terminalCount != null) {
    evidence.terminalCountModifierId = terminalCountModifierFor(input.terminalCount);
  }
  if (input.cnpPercent != null) {
    evidence.cnpModifierId = cnpModifierFor(input.cnpPercent);
  }
  if (input.employeeCount != null) {
    evidence.employeesModifierId = employeesModifierFor(input.employeeCount);
  }
  evidence.soleTrader = Boolean(input.soleTrader);
  evidence.multiSiteConfirmed = Boolean(input.multiSiteConfirmed);

  return evidence;
}
