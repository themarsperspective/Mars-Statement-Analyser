export const SERVICE_NAMES = [
  "Utilities",
  "EPOS",
  "Insurance",
  "Telecoms",
  "Business Finance",
  "Commercial Finance",
  "Employee Benefits",
  "E-commerce",
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface ScoreBand {
  label: string;
  description: string;
}

/** One modifier that actually fired for a given service, after evidence-gating and conflict resolution. */
export interface ModifierFired {
  id: string;
  condition: string;
  /** Net point change actually applied to this one service (not the modifier's full adjustment set, which may touch several services). */
  delta: number;
}

export interface OpportunityScore {
  service: ServiceName;
  baseScore: number;
  finalScore: number;
  band: ScoreBand;
  modifiersFired: ModifierFired[];
}

export interface HighRiskAssessment {
  /** Whether a base score applied at all (see the businessClub/scoring.ts comment on the "configured specialist sector" gap in the config). */
  applicable: boolean;
  finalScore: number | null;
  band: ScoreBand | null;
  /** applicable && finalScore >= display_threshold */
  visible: boolean;
  modifiersFired: ModifierFired[];
  reason: string;
}

export interface IndustryClassification {
  industry: string;
  confidence: "high" | "medium" | "low";
  /** Human-readable basis for the classification, e.g. "MCC 5812" or "business name matched /restaurant/i". */
  basis: string;
}

export interface DeterministicScoringResult {
  classification: IndustryClassification;
  /** All 8 services, unfiltered. */
  scores: OpportunityScore[];
  /** Top 3-5 of the above with finalScore >= 60 (the "Low" band is hidden by default). */
  ranked: OpportunityScore[];
  highRisk: HighRiskAssessment;
}

/** Composed deterministically by compose.ts from the service core template plus any industry/modifier context — never AI-generated. */
export interface OpportunityExplanation {
  service: ServiceName;
  whyFlagged: string;
  qualifyingQuestion: string;
  nextStep: string;
}
