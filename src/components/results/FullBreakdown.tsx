import Chevron from "../Chevron";
import { SECTION_ACCENTS } from "@/lib/sectionAccents";
import { ExtractedData, FeeItem, RateCardItem, SchemeRate } from "@/lib/types";

type FieldKey = "mcc" | "transactionCount" | "averageTransactionValue";
type FeeListKey = "actualCharges" | "otherAdjustments";

const FIELD_CONFIG: { key: FieldKey; label: string; type: "text" | "number" }[] = [
  { key: "mcc", label: "Merchant Category Code (MCC)", type: "text" },
  { key: "transactionCount", label: "Total Transaction Count", type: "number" },
  { key: "averageTransactionValue", label: "Average Transaction Value", type: "number" },
];

const ROW_INPUT =
  "w-full border border-neutral-300 bg-white px-2.5 py-1.5 text-base text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors";
const ADD_BUTTON =
  "text-sm font-medium border border-neutral-300 px-3 py-1.5 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors";
const REMOVE_BUTTON = "text-neutral-300 hover:text-neutral-900 text-base leading-none transition-colors";

function fmtNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface FullBreakdownProps {
  data: ExtractedData;
  editable?: boolean;
  onFieldChange?: (key: FieldKey, value: string) => void;
  onSchemeRateChange?: (index: number, field: keyof SchemeRate, value: string) => void;
  onAddSchemeRate?: () => void;
  onRemoveSchemeRate?: (index: number) => void;
  onRateCardChange?: (index: number, field: keyof RateCardItem, value: string) => void;
  onAddRateCardRow?: () => void;
  onRemoveRateCardRow?: (index: number) => void;
  onFeeChange?: (listKey: FeeListKey, index: number, field: keyof FeeItem, value: string) => void;
  onAddFeeRow?: (listKey: FeeListKey) => void;
  onRemoveFeeRow?: (listKey: FeeListKey, index: number) => void;
}

export default function FullBreakdown({
  data,
  editable = false,
  onFieldChange,
  onSchemeRateChange,
  onAddSchemeRate,
  onRemoveSchemeRate,
  onRateCardChange,
  onAddRateCardRow,
  onRemoveRateCardRow,
  onFeeChange,
  onAddFeeRow,
  onRemoveFeeRow,
}: FullBreakdownProps) {
  return (
    <details className="group border border-neutral-200">
      <summary className="cursor-pointer select-none list-none px-5 py-4 flex items-center justify-between transition-colors bg-neutral-50 hover:bg-neutral-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          View Full Statement Breakdown
        </span>
        <Chevron />
      </summary>

      <div className="border-t border-neutral-200 p-5 sm:p-6 bg-white flex flex-col gap-4">
        <Subsection accent="sky" title="Statement Details" defaultOpen>
          <div className="border border-neutral-200 divide-y divide-neutral-200 bg-white text-base">
            {FIELD_CONFIG.map((field) =>
              editable ? (
                <div key={field.key} className="grid grid-cols-2 items-center px-4 py-2.5 gap-4">
                  <label className="text-neutral-600">{field.label}</label>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    step={field.type === "number" ? "any" : undefined}
                    value={data[field.key] ?? ""}
                    onChange={(e) => onFieldChange?.(field.key, e.target.value)}
                    className={ROW_INPUT}
                  />
                </div>
              ) : (
                <div key={field.key} className="grid grid-cols-2 px-4 py-2.5 gap-4">
                  <span className="text-neutral-600">{field.label}</span>
                  <span className="text-neutral-900 tabular-nums">
                    {field.key === "averageTransactionValue" && data[field.key] !== null
                      ? `£${fmtNumber(data[field.key] as number)}`
                      : field.key === "transactionCount"
                        ? fmtNumber(data[field.key] as number | null)
                        : (data[field.key] as string) || "—"}
                  </span>
                </div>
              )
            )}
          </div>
        </Subsection>

        {(editable || data.schemeRates.length > 0) && (
          <Subsection accent="violet" title="Scheme Rates (stated)" defaultOpen>
            {editable && (
              <div className="flex justify-end mb-2">
                <button onClick={onAddSchemeRate} className={ADD_BUTTON}>
                  + Add row
                </button>
              </div>
            )}
            <div className="border border-neutral-200 bg-white text-base">
              {data.schemeRates.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No scheme-level rates stated.</p>
              )}
              {data.schemeRates.map((sr, i) =>
                editable ? (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_100px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                  >
                    <input
                      type="text"
                      value={sr.scheme}
                      onChange={(e) => onSchemeRateChange?.(i, "scheme", e.target.value)}
                      className={ROW_INPUT}
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={sr.ratePercent ?? ""}
                        onChange={(e) => onSchemeRateChange?.(i, "ratePercent", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <span className="text-neutral-400">%</span>
                    </div>
                    <button onClick={() => onRemoveSchemeRate?.(i)} aria-label="Remove row" className={REMOVE_BUTTON}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div key={i} className="flex justify-between px-4 py-2.5 border-b border-neutral-100 last:border-b-0">
                    <span className="text-neutral-700">{sr.scheme || "—"}</span>
                    <span className="text-neutral-900 tabular-nums">
                      {sr.ratePercent !== null ? `${sr.ratePercent}%` : "—"}
                    </span>
                  </div>
                )
              )}
            </div>
          </Subsection>
        )}

        {(editable || data.rateCard.length > 0) && (
          <Subsection accent="orange" title="Rate Card" defaultOpen>
            <p className="text-sm text-neutral-500 mb-2">
              Contracted rates the merchant is set up to pay per transaction type — not amounts actually charged
              this period.
            </p>
            {editable && (
              <div className="flex justify-end mb-2">
                <button onClick={onAddRateCardRow} className={ADD_BUTTON}>
                  + Add row
                </button>
              </div>
            )}
            <div className="border border-neutral-200 bg-white text-base">
              {data.rateCard.length === 0 && <p className="px-4 py-3 text-neutral-400">No rate card detected.</p>}
              {data.rateCard.map((item, i) =>
                editable ? (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_120px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                  >
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => onRateCardChange?.(i, "label", e.target.value)}
                      className={ROW_INPUT}
                    />
                    <input
                      type="text"
                      value={item.rate}
                      onChange={(e) => onRateCardChange?.(i, "rate", e.target.value)}
                      className={ROW_INPUT}
                    />
                    <button onClick={() => onRemoveRateCardRow?.(i)} aria-label="Remove row" className={REMOVE_BUTTON}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                  >
                    <span className="text-neutral-700">{item.label || "—"}</span>
                    <span className="text-neutral-900 text-right tabular-nums">{item.rate || "—"}</span>
                  </div>
                )
              )}
            </div>
          </Subsection>
        )}

        <Subsection accent="rose" title={`Actual Charges (${data.actualCharges.length} item${data.actualCharges.length === 1 ? "" : "s"})`}>
          <p className="text-sm text-neutral-500 mb-2">Itemised amounts actually deducted this statement period.</p>
          {editable && (
            <div className="flex justify-end mb-2">
              <button onClick={() => onAddFeeRow?.("actualCharges")} className={ADD_BUTTON}>
                + Add line item
              </button>
            </div>
          )}
          <div className="border border-neutral-200 bg-white text-base">
            {data.actualCharges.length === 0 && (
              <p className="px-4 py-3 text-neutral-400">No fee line items detected.</p>
            )}
            {data.actualCharges.map((fee, i) =>
              editable ? (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_140px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                >
                  <input
                    type="text"
                    value={fee.label}
                    onChange={(e) => onFeeChange?.("actualCharges", i, "label", e.target.value)}
                    className={ROW_INPUT}
                  />
                  <input
                    type="number"
                    step="any"
                    value={fee.amount ?? ""}
                    onChange={(e) => onFeeChange?.("actualCharges", i, "amount", e.target.value)}
                    className={ROW_INPUT}
                  />
                  <button
                    onClick={() => onRemoveFeeRow?.("actualCharges", i)}
                    aria-label="Remove line item"
                    className={REMOVE_BUTTON}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                >
                  <span className="text-neutral-700">{fee.label || "—"}</span>
                  <span className="text-neutral-900 tabular-nums">{fmtNumber(fee.amount)}</span>
                </div>
              )
            )}
          </div>
        </Subsection>

        {(editable || data.otherAdjustments.length > 0) && (
          <Subsection accent="slate" title="Other Adjustments">
            <p className="text-sm text-neutral-500 mb-2">
              Rejected/resubmitted deposits, refunds, chargebacks. Not counted as fees or in the blended rate.
            </p>
            {editable && (
              <div className="flex justify-end mb-2">
                <button onClick={() => onAddFeeRow?.("otherAdjustments")} className={ADD_BUTTON}>
                  + Add line item
                </button>
              </div>
            )}
            <div className="border border-neutral-200 bg-white text-base">
              {data.otherAdjustments.length === 0 && (
                <p className="px-4 py-3 text-neutral-400">No adjustments detected.</p>
              )}
              {data.otherAdjustments.map((item, i) =>
                editable ? (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_140px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                  >
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => onFeeChange?.("otherAdjustments", i, "label", e.target.value)}
                      className={ROW_INPUT}
                    />
                    <input
                      type="number"
                      step="any"
                      value={item.amount ?? ""}
                      onChange={(e) => onFeeChange?.("otherAdjustments", i, "amount", e.target.value)}
                      className={ROW_INPUT}
                    />
                    <button
                      onClick={() => onRemoveFeeRow?.("otherAdjustments", i)}
                      aria-label="Remove line item"
                      className={REMOVE_BUTTON}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-b-0"
                  >
                    <span className="text-neutral-700">{item.label || "—"}</span>
                    <span className="text-neutral-900 tabular-nums">{fmtNumber(item.amount)}</span>
                  </div>
                )
              )}
            </div>
          </Subsection>
        )}
      </div>
    </details>
  );
}

function Subsection({
  accent,
  title,
  defaultOpen,
  children,
}: {
  accent: keyof typeof SECTION_ACCENTS;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const a = SECTION_ACCENTS[accent];
  return (
    <details className={`group ${a.wrapper}`} {...(defaultOpen ? { open: true } : {})}>
      <summary className="cursor-pointer select-none list-none flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wider ${a.label}`}>{title}</span>
        <Chevron />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
