import raw from "../opportunity-matrix.json";
import { ServiceName } from "./types";

export interface RawIndustryScores extends Record<ServiceName, number> {
  premises_dependency: "High" | "Medium" | "Low";
}

export interface RawModifier {
  id: string;
  condition: string;
  adjustments?: Partial<Record<ServiceName, number>>;
  set_minimum?: Partial<Record<ServiceName, number>>;
  adjustments_by_premises_dependency?: Record<"High" | "Medium" | "Low", Partial<Record<ServiceName, number>>>;
  conflict_group?: string;
  confidence?: "inferred" | "confirmed";
  note?: string;
}

export interface RawScoreBand {
  min: number;
  max: number;
  label: string;
  description: string;
}

export interface RawHighRiskModifier {
  condition: string;
  adjustment: number;
}

export const INDUSTRIES = raw.industries as unknown as Record<string, RawIndustryScores>;
export const MODIFIERS = raw.modifiers as unknown as RawModifier[];
export const CONFLICT_GROUPS = raw.conflict_rules.conflict_groups as Record<string, { prefer: string; over: string }>;
export const HIGH_RISK_CONFIG = raw.high_risk_merchant_services as {
  hidden_by_default: boolean;
  base_score_if_configured_specialist_sector: number;
  modifiers: RawHighRiskModifier[];
  max_score: number;
  display_threshold: number;
  wording_rule: string;
};
export const SCORE_BANDS = raw.score_bands as unknown as RawScoreBand[];

export const OTHER_UNCLASSIFIED = "Other / Unclassified";
