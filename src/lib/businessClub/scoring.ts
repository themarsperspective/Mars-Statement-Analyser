import { ExtractedData } from "../types";
import { classifyIndustry } from "./classifyIndustry";
import { gatherEvidence } from "./evidence";
import { CONFLICT_GROUPS, INDUSTRIES, MODIFIERS, OTHER_UNCLASSIFIED, SCORE_BANDS } from "./config";
import { DeterministicScoringResult, HighRiskAssessment, ModifierFired, OpportunityScore, ScoreBand, SERVICE_NAMES } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bandFor(score: number): ScoreBand {
  const band = SCORE_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? { label: band.label, description: band.description } : { label: "Low", description: "" };
}

export function computeDeterministicScoring(data: ExtractedData): DeterministicScoringResult {
  const classification = classifyIndustry(data);
  const industryScores = INDUSTRIES[classification.industry] ?? INDUSTRIES[OTHER_UNCLASSIFIED];

  const evidence = gatherEvidence(data);

  // Which modifier IDs actually fire, before conflict resolution. Today this
  // is at most turnover-band + existing-EPOS — everything else has no
  // evidence available from an extracted statement (see evidence.ts).
  const firingIds = new Set<string>();
  if (evidence.turnoverBandModifierId) firingIds.add(evidence.turnoverBandModifierId);
  if (evidence.existingEposPresent) firingIds.add("existing_epos_present");
  // no_premises is evaluated separately below (it's keyed by premises_dependency,
  // not a flat adjustment) and never fires either without "confirmed no premises"
  // evidence, which isn't extractable from a statement today.

  // Conflict resolution: where both sides of a conflict group would fire,
  // keep only the preferred (more specific/confirmed) one.
  for (const group of Object.values(CONFLICT_GROUPS)) {
    if (firingIds.has(group.prefer) && firingIds.has(group.over)) {
      firingIds.delete(group.over);
    }
  }

  const scores: OpportunityScore[] = SERVICE_NAMES.map((service) => {
    const baseScore = industryScores[service];
    let value = baseScore;
    const modifiersFired: ModifierFired[] = [];

    for (const id of firingIds) {
      const def = MODIFIERS.find((m) => m.id === id);
      if (!def) continue;

      if (def.set_minimum && typeof def.set_minimum[service] === "number") {
        value = Math.max(value, def.set_minimum[service] as number);
      }
      const delta = def.adjustments?.[service];
      if (typeof delta === "number" && delta !== 0) {
        value += delta;
        modifiersFired.push({ id: def.id, condition: def.condition, delta });
      }
    }

    // no_premises would be applied here, keyed by industryScores.premises_dependency
    // per the config's adjustments_by_premises_dependency — never fires today since
    // "confirmed no premises" isn't evidence extractable from a statement.

    value = clamp(value);
    return { service, baseScore, finalScore: value, band: bandFor(value), modifiersFired };
  });

  const ranked = [...scores].filter((s) => s.finalScore >= 60).sort((a, b) => b.finalScore - a.finalScore).slice(0, 5);

  const highRisk = computeHighRisk();

  return { classification, scores, ranked, highRisk };
}

// The config's High-Risk Merchant Services base score is keyed off "configured
// specialist sector", but no per-industry flag for that exists in the given
// config, and its three modifiers (prior acquiring rejection, specialist
// restrictions/reserve terms, existing stable specialist arrangement) describe
// acquiring-relationship history that doesn't appear on a standard statement
// either. So this stays evidence-only and inapplicable until either is added —
// hidden_by_default and display_threshold (70) both still apply once it can fire.
function computeHighRisk(): HighRiskAssessment {
  return {
    applicable: false,
    finalScore: null,
    band: null,
    visible: false,
    modifiersFired: [],
    reason:
      "No per-industry \"configured specialist sector\" flag is defined in the config, and no current extraction detects acquiring-relationship history (rejection, specialist restrictions, or an existing specialist arrangement) from a statement.",
  };
}
