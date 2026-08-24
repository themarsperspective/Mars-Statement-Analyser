import Link from "next/link";
import { notFound } from "next/navigation";
import { getStatementById } from "@/lib/storage";
import SummaryCard from "@/components/SummaryCard";
import FullBreakdown from "@/components/results/FullBreakdown";
import PartnerComparison from "@/components/results/PartnerComparison";
import BusinessClubReveal from "@/components/results/BusinessClubReveal";
import { computeDeterministicScoring } from "@/lib/businessClub/scoring";
import { composeExplanation } from "@/lib/businessClub/compose";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const statement = await getStatementById(id);
  if (!statement) notFound();

  const { data } = statement;
  const totalActualCharges = Math.abs(data.actualCharges.reduce((sum, f) => sum + (f.amount ?? 0), 0));
  const businessClubScoring = computeDeterministicScoring(data);
  const businessClubExplanations = businessClubScoring.ranked.map((s) =>
    composeExplanation(s.service, businessClubScoring.classification.industry, s.modifiersFired)
  );

  return (
    <div className="mx-auto max-w-[950px] px-6 sm:px-10 lg:px-14 py-12 sm:py-14 flex flex-col gap-10">
      <div>
        <Link
          href="/statements"
          className="text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          ← All Statements
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mt-3">
          {data.merchantName || "Unnamed Statement"}
        </h1>
        <p className="text-sm text-neutral-500 mt-1.5">
          {statement.sourceFileName} · Saved {fmtDate(statement.savedAt)}
        </p>
      </div>

      <SummaryCard data={data} totalActualCharges={totalActualCharges} />

      <FullBreakdown data={data} />

      <PartnerComparison data={data} totalActualCharges={totalActualCharges} />

      <BusinessClubReveal scoring={businessClubScoring} explanations={businessClubExplanations} />
    </div>
  );
}
