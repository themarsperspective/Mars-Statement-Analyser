import { ServiceName } from "../types";

export interface ModifierContextEntry {
  /** opportunity-matrix.json modifier ID(s) this context applies to — a list since the spec's named concepts sometimes span more than one config modifier (see MULTIPLE_TERMINALS below). */
  modifierIds: string[];
  service: ServiceName;
  context: string;
}

// Layer 3 — Modifier Context. Appended when a statement modifier actually
// fires (per scoring.ts's evidence-gating). The spec's three worked
// examples, mapped onto the real modifier IDs already defined in
// opportunity-matrix.json:
//   - MULTIPLE_TERMINALS -> the config splits "multiple terminals" into two
//     tiers (epos_3_4_terminals, epos_5plus_terminals); either one firing
//     matches the spec's "multiple terminals" concept, so both map here.
//   - CONFIRMED_MULTI_SITE -> multi_site_confirmed (exact match).
//   - HIGH_CNP ("significant proportion of CNP activity") -> cnp_50plus,
//     the config's tier that actually represents "significant".
export const MODIFIER_CONTEXT: ModifierContextEntry[] = [
  {
    modifierIds: ["epos_3_4_terminals", "epos_5plus_terminals"],
    service: "EPOS",
    context:
      "Multiple payment terminals increase the relevance of reviewing whether payments and EPOS are properly integrated.",
  },
  {
    modifierIds: ["multi_site_confirmed"],
    service: "Utilities",
    context: "Multiple locations increase the value of reviewing utility contracts across the wider business.",
  },
  {
    modifierIds: ["cnp_50plus"],
    service: "E-commerce",
    context:
      "A significant proportion of card-not-present activity increases the relevance of reviewing online payment infrastructure.",
  },
];
