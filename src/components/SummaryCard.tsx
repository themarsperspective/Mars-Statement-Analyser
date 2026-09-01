import { ExtractedData } from "@/lib/types";

interface SummaryCardProps {
  data: ExtractedData;
  totalActualCharges: number;
  editable?: boolean;
  onTextFieldChange?: (key: "merchantName" | "acquirerName" | "statementPeriod", value: string) => void;
  onTurnoverChange?: (value: string) => void;
  onBlendedValueChange?: (value: string) => void;
  onBlendedSourceChange?: (value: string) => void;
}

const inputBase =
  "bg-white border border-indigo-200 px-2.5 py-1.5 text-neutral-900 focus:outline-none focus:border-indigo-600 transition-colors";

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SummaryCard({
  data,
  totalActualCharges,
  editable = false,
  onTextFieldChange,
  onTurnoverChange,
  onBlendedValueChange,
  onBlendedSourceChange,
}: SummaryCardProps) {
  return (
    <div className="border border-indigo-200 border-t-4 border-t-indigo-600 bg-indigo-50 shadow-[0_2px_8px_rgba(67,56,202,0.08)]">
      <div className="px-6 sm:px-7 py-5 border-b border-indigo-100 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <IdentityField label="Merchant Name" grow>
          {editable ? (
            <input
              type="text"
              value={data.merchantName ?? ""}
              onChange={(e) => onTextFieldChange?.("merchantName", e.target.value)}
              className={`${inputBase} w-full text-base font-medium`}
            />
          ) : (
            <h2 className="text-2xl font-semibold text-neutral-900 leading-tight">
              {data.merchantName || "—"}
            </h2>
          )}
        </IdentityField>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 shrink-0">
          <IdentityField label="Acquirer / Provider">
            {editable ? (
              <input
                type="text"
                value={data.acquirerName ?? ""}
                onChange={(e) => onTextFieldChange?.("acquirerName", e.target.value)}
                className={`${inputBase} w-full sm:w-40 text-sm`}
              />
            ) : (
              <span className="text-base text-neutral-700">{data.acquirerName || "—"}</span>
            )}
          </IdentityField>

          <IdentityField label="Statement Period">
            {editable ? (
              <input
                type="text"
                value={data.statementPeriod ?? ""}
                onChange={(e) => onTextFieldChange?.("statementPeriod", e.target.value)}
                className={`${inputBase} w-full sm:w-44 text-sm`}
              />
            ) : (
              <span className="text-base text-neutral-700">{data.statementPeriod || "—"}</span>
            )}
          </IdentityField>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-indigo-100">
        <StatTile label="Blended / Effective Rate">
          {editable ? (
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={data.blendedRate.value ?? ""}
                  onChange={(e) => onBlendedValueChange?.(e.target.value)}
                  className={`${inputBase} w-20 text-lg font-semibold shrink-0`}
                />
                <span className="text-lg text-indigo-400">%</span>
              </div>
              <select
                value={data.blendedRate.source ?? ""}
                onChange={(e) => onBlendedSourceChange?.(e.target.value)}
                className="w-full max-w-full bg-white border border-indigo-200 px-2 py-1.5 text-xs text-neutral-600 focus:outline-none focus:border-indigo-600"
              >
                <option value="">—</option>
                <option value="stated">Stated on statement</option>
                <option value="calculated">Calculated</option>
              </select>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
                {data.blendedRate.value !== null ? `${data.blendedRate.value}%` : "—"}
              </span>
              {data.blendedRate.source && (
                <span className="text-sm text-indigo-500">
                  {data.blendedRate.source === "stated" ? "Stated on statement" : "Calculated"}
                </span>
              )}
            </div>
          )}
        </StatTile>

        <StatTile label="Total Actual Charges This Period">
          <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
            £{fmtMoney(totalActualCharges)}
          </span>
        </StatTile>

        <StatTile label="Total Card Turnover">
          {editable ? (
            <input
              type="number"
              step="any"
              value={data.totalTurnover ?? ""}
              onChange={(e) => onTurnoverChange?.(e.target.value)}
              className={`${inputBase} w-full text-lg font-semibold`}
            />
          ) : (
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
              £{fmtMoney(data.totalTurnover)}
            </span>
          )}
        </StatTile>
      </div>

      {(data.transactionCount !== null || data.averageTransactionValue !== null) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-6 sm:px-7 py-3 border-t border-indigo-100 bg-white">
          {data.transactionCount !== null && (
            <MiniStat label="Transaction Count" value={data.transactionCount.toLocaleString()} />
          )}
          {data.averageTransactionValue !== null && (
            <MiniStat label="Average Transaction Value" value={`£${fmtMoney(data.averageTransactionValue)}`} />
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">{label}</span>
      <span className="text-base font-semibold text-neutral-700 tabular-nums">{value}</span>
    </div>
  );
}

function IdentityField({
  label,
  children,
  grow,
}: {
  label: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${grow ? "flex-1 min-w-0" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">{label}</span>
      {children}
    </div>
  );
}

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 sm:px-7 py-5 flex flex-col gap-2 min-w-0 bg-white">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">{label}</span>
      {children}
    </div>
  );
}
