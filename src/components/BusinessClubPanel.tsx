import { DeterministicScoringResult, ModifierFired, OpportunityExplanation, ScoreBand } from "@/lib/businessClub/types";

interface BusinessClubPanelProps {
  scoring: DeterministicScoringResult;
  /** One composed explanation per ranked opportunity, in the same order as scoring.ranked. Fully deterministic — see src/lib/businessClub/compose.ts. */
  explanations: OpportunityExplanation[];
}

export default function BusinessClubPanel({ scoring, explanations }: BusinessClubPanelProps) {
  if (scoring.ranked.length === 0) {
    return (
      <p className="text-base text-neutral-400 border border-dashed border-neutral-300 bg-white px-4 py-6 text-center">
        No opportunities scored 60 or above for this statement (industry: {scoring.classification.industry}).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-500">
        Industry: <span className="font-medium text-neutral-800">{scoring.classification.industry}</span>
        {scoring.classification.confidence !== "high" && (
          <span className="text-amber-700"> (uncertain — {scoring.classification.basis})</span>
        )}
      </p>

      <div className="flex flex-col gap-4">
        {scoring.ranked.map((s, i) => (
          <OpportunityCard
            key={s.service}
            score={{ service: s.service, finalScore: s.finalScore, band: s.band, modifiersFired: s.modifiersFired }}
            explanation={explanations[i]}
          />
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({
  score,
  explanation,
}: {
  score: { service: string; finalScore: number; band: ScoreBand; modifiersFired: ModifierFired[] };
  explanation: OpportunityExplanation;
}) {
  return (
    <div className="border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-fuchsia-50 border-b border-neutral-200">
        <span className="font-bold text-lg text-neutral-900">{score.service}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base font-bold text-fuchsia-900 tabular-nums">{score.finalScore}/100</span>
          <span className="text-xs font-semibold uppercase tracking-wide border border-fuchsia-300 bg-white text-fuchsia-800 px-1.5 py-0.5">
            {score.band.label}
          </span>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3 bg-white">
        <Field label="Why flagged" value={explanation.whyFlagged} />
        <Field label="Qualifying question" value={explanation.qualifyingQuestion} />
        <Field label="Next step" value={explanation.nextStep} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
      <span className="text-base text-neutral-800 leading-relaxed">{value}</span>
    </div>
  );
}
