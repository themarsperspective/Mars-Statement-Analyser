import { PricingStatus } from "@/lib/types";

// "Calculated" is a subtle positive indicator — never implies a formally
// confirmed/underwritten provider quote, only that enough configured pricing
// data exists to model a meaningful comparison. Indicative/Unavailable are
// deliberately more muted so a low indicative "from" rate never reads as
// equivalent to a calculated one.
const STYLES: Record<PricingStatus, { label: string; className: string }> = {
  calculated: { label: "Calculated", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  indicative: { label: "Indicative", className: "border-amber-300 bg-amber-50 text-amber-800" },
  unavailable: { label: "Unavailable", className: "border-neutral-300 bg-neutral-50 text-neutral-500" },
};

export default function PricingStatusBadge({ status }: { status: PricingStatus }) {
  const s = STYLES[status];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border px-1.5 py-0.5 shrink-0 ${s.className}`}>
      {s.label}
    </span>
  );
}
