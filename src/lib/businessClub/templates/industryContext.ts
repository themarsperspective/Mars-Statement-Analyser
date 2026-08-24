import { ServiceName } from "../types";

export interface IndustryContextEntry {
  industry: string;
  service: ServiceName;
  context: string;
  /** Rarely used — per the spec, only override the service-level qualifying question where a genuinely better industry-specific one exists. */
  qualifyingQuestionOverride?: string;
}

// Layer 2 — Industry Context. Only for Industry x Service pairs that are
// genuinely important to that industry — not full 232-pair coverage.
// Seeded here with the two worked examples from the spec; the user will
// supply more separately, targeting ~40-60 total and prioritising pairs
// where the base Opportunity Score is 70+. Adding more is a pure data
// edit to this array — no code changes needed.
export const INDUSTRY_CONTEXT: IndustryContextEntry[] = [
  {
    industry: "Pub / Bar",
    service: "Utilities",
    context:
      "Pubs often have significant energy usage from refrigeration, cellar cooling, heating, lighting and extended opening hours.",
  },
  {
    industry: "Restaurant",
    service: "EPOS",
    context: "Restaurants often benefit from integrated ordering, table management and payment systems.",
  },
];
