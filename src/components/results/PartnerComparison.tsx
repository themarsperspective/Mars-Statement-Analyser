import { ExtractedData } from "@/lib/types";
import { computeRanking } from "@/lib/ranking";
import { PARTNER_RATE_CARDS } from "@/lib/partnerRates";
import TopThreeCards from "./TopThreeCards";
import ProviderCompareList from "./ProviderCompareList";
import OtherProvidersCompact from "./OtherProvidersCompact";

export default function PartnerComparison({
  data,
  totalActualCharges,
}: {
  data: ExtractedData;
  totalActualCharges: number;
}) {
  const ranking = computeRanking(data);
  const rateCardByName = new Map(PARTNER_RATE_CARDS.map((p) => [p.partner, p]));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-neutral-900">Partner Comparison</h2>
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 border border-neutral-200 px-2 py-0.5">
          Internal view
        </span>
      </div>

      {ranking.singleDayNotice && (
        <p className="text-base text-amber-900 bg-amber-50 border border-amber-300 px-4 py-3 leading-relaxed">
          <span className="font-semibold uppercase tracking-wide text-xs block mb-1">Single-day statement</span>
          {ranking.singleDayNotice}
        </p>
      )}

      <TopThreeCards
        ranking={ranking}
        currentAcquirerName={data.acquirerName}
        currentCost={totalActualCharges}
        isSingleDayStatement={ranking.singleDayNotice !== null}
      />

      <ProviderCompareList
        estimates={ranking.estimates}
        rateCardByName={rateCardByName}
        totalActualCharges={totalActualCharges}
      />

      <OtherProvidersCompact otherOptions={ranking.otherOptions} />
    </section>
  );
}
