"use client";

import { useState } from "react";
import BusinessClubPanel from "../BusinessClubPanel";
import { DeterministicScoringResult, OpportunityExplanation } from "@/lib/businessClub/types";

interface BusinessClubRevealProps {
  scoring: DeterministicScoringResult;
  explanations: OpportunityExplanation[];
}

/**
 * Scoring/explanations are computed eagerly by the caller (deterministic,
 * local, no external API cost) — only the DISPLAY is gated behind the click.
 * This is not lazy analysis, just a gated reveal of an already-known result.
 */
export default function BusinessClubReveal({ scoring, explanations }: BusinessClubRevealProps) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="border border-fuchsia-200">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-fuchsia-50/60 border-b border-fuchsia-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800">Business Club</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
          >
            Hide
          </button>
        </div>
        <div className="p-5">
          <BusinessClubPanel scoring={scoring} explanations={explanations} />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-fuchsia-200 bg-fuchsia-50/30 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-base font-semibold text-neutral-900">Business Club</p>
        <p className="text-base text-neutral-600">Explore other opportunities for this business.</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold uppercase tracking-wide bg-fuchsia-900 text-white px-4 py-2.5 hover:bg-fuchsia-800 transition-colors shrink-0"
      >
        Open Business Club →
      </button>
    </div>
  );
}
