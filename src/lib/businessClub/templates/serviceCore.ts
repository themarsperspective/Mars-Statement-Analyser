import { ServiceName } from "../types";

export interface ServiceCoreTemplate {
  whyBase: string;
  qualifyingQuestion: string;
  nextStep: string;
}

// Layer 1 — Service Core Templates. One approved generic template per
// service, usable for any merchant where no more specific industry copy
// exists. next_step content is the spec's own wording (near-verbatim —
// only normalised into a complete sentence where the spec gave a short
// label rather than a full sentence, e.g. "Current policy and renewal
// date" -> "Obtain the current policy and renewal date."). Only Utilities
// had a full why_base/qualifying_question worked example in the spec; the
// other seven are written in the same neutral, factual, non-claim-making
// tone, with Business Finance / Commercial Finance following the
// established "worth discussing if the conversation allows" wording rule
// (never "likely needs finance").
export const SERVICE_CORE_TEMPLATES: Record<ServiceName, ServiceCoreTemplate> = {
  Utilities: {
    whyBase: "Utilities are a significant recurring business overhead and may be worth reviewing.",
    qualifyingQuestion: "When were your current business utility contracts last reviewed?",
    nextStep: "Obtain the latest utility bill.",
  },
  Insurance: {
    whyBase: "Business insurance is a recurring commercial cost and may be worth reviewing.",
    qualifyingQuestion: "When was your business insurance last reviewed or put out to market?",
    nextStep: "Obtain the current policy and renewal date.",
  },
  EPOS: {
    whyBase: "EPOS and payment setup can materially affect day-to-day operations and may be worth reviewing.",
    qualifyingQuestion: "How happy are you with your current EPOS and payment setup?",
    nextStep: "Confirm current EPOS provider and setup.",
  },
  Telecoms: {
    whyBase: "Telecoms and connectivity are a recurring business cost and may be worth reviewing.",
    qualifyingQuestion: "When were your current telecoms or broadband contracts last reviewed?",
    nextStep: "Obtain current telecoms/broadband bill or contract details.",
  },
  "Business Finance": {
    whyBase:
      "Access to working capital or funding is a relevant consideration for many businesses and may be worth discussing if the conversation allows.",
    qualifyingQuestion: "Is funding or working capital something that's come up for the business recently?",
    nextStep: "Establish funding requirement.",
  },
  "Commercial Finance": {
    whyBase:
      "Asset, property or equipment finance is a relevant consideration for businesses making capital purchases, and may be worth discussing if the conversation allows.",
    qualifyingQuestion: "Is the business planning any equipment, vehicle or property purchases?",
    nextStep: "Establish asset/property/equipment requirement.",
  },
  "Employee Benefits": {
    whyBase: "Employee benefits are a recurring consideration for employers and may be worth reviewing.",
    qualifyingQuestion: "Does the business currently offer any employee benefits?",
    nextStep: "Confirm employee count and current benefits.",
  },
  "E-commerce": {
    whyBase:
      "Online sales and payment infrastructure are a relevant consideration for businesses with an online presence and may be worth reviewing.",
    qualifyingQuestion: "Does the business take any online or card-not-present payments?",
    nextStep: "Confirm online sales/payment setup.",
  },
};
