import { ModifierFired, OpportunityExplanation, ServiceName } from "./types";
import { SERVICE_CORE_TEMPLATES } from "./templates/serviceCore";
import { INDUSTRY_CONTEXT } from "./templates/industryContext";
import { MODIFIER_CONTEXT } from "./templates/modifierContext";

// Fully deterministic, local, template-only composition — no AI call, no
// freeform generation. Per the spec's Output Composition order:
//   1. Industry-specific context, if available.
//   2. Relevant modifier-specific context, if applicable.
//   3. Generic service explanation, only if neither 1 nor 2 applied.
// Industry and modifier context are complementary (not repeats of the same
// idea), so both are included when both apply; the generic why_base is a
// pure fallback used only when this opportunity has no more specific copy.
export function composeExplanation(
  service: ServiceName,
  industry: string,
  modifiersFired: ModifierFired[]
): OpportunityExplanation {
  const core = SERVICE_CORE_TEMPLATES[service];

  const industryEntry = INDUSTRY_CONTEXT.find((e) => e.industry === industry && e.service === service);

  const firedIds = new Set(modifiersFired.map((m) => m.id));
  const modifierEntries = MODIFIER_CONTEXT.filter(
    (e) => e.service === service && e.modifierIds.some((id) => firedIds.has(id))
  );

  const parts: string[] = [];
  if (industryEntry) parts.push(industryEntry.context);
  for (const entry of modifierEntries) parts.push(entry.context);

  return {
    service,
    whyFlagged: parts.length > 0 ? parts.join(" ") : core.whyBase,
    qualifyingQuestion: industryEntry?.qualifyingQuestionOverride ?? core.qualifyingQuestion,
    nextStep: core.nextStep,
  };
}
