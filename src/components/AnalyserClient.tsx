"use client";

import { useState } from "react";
import Link from "next/link";
import Dropzone from "./Dropzone";
import SummaryCard from "./SummaryCard";
import PartnerRanking from "./PartnerRanking";
import AccentDetails from "./AccentDetails";
import { SECTION_ACCENTS } from "@/lib/sectionAccents";
import { emptyExtractedData, ExtractedData, FeeItem, RateCardItem, SchemeRate } from "@/lib/types";
import { SAVE_UNAVAILABLE_MESSAGE } from "@/lib/deployment";

type FieldKey = "mcc" | "transactionCount" | "averageTransactionValue";

const FIELD_CONFIG: { key: FieldKey; label: string; type: "text" | "number" }[] = [
  { key: "mcc", label: "Merchant Category Code (MCC)", type: "text" },
  { key: "transactionCount", label: "Total Transaction Count", type: "number" },
  { key: "averageTransactionValue", label: "Average Transaction Value", type: "number" },
];

type TextFieldKey = "merchantName" | "acquirerName" | "statementPeriod";

function sumActualCharges(data: ExtractedData): number {
  return Math.abs(data.actualCharges.reduce((sum, f) => sum + (f.amount ?? 0), 0));
}

type Status = "idle" | "loading" | "ready" | "saving" | "saved" | "error";

const ROW_INPUT =
  "w-full border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors";
const ADD_BUTTON =
  "text-xs font-medium border border-neutral-300 px-3 py-1.5 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors";
const REMOVE_BUTTON = "text-neutral-300 hover:text-neutral-900 text-base leading-none transition-colors";

export default function AnalyserClient({ saveAvailable = true }: { saveAvailable?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ExtractedData>(emptyExtractedData());
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [savedId, setSavedId] = useState<string>("");

  async function handleFile(file: File) {
    setStatus("loading");
    setError("");
    setSavedId("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to parse file.");
      setData(json.data);
      setSourceFileName(json.fileName);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function updateField(key: FieldKey, value: string) {
    setData((prev) => {
      const config = FIELD_CONFIG.find((f) => f.key === key)!;
      const parsed = config.type === "number" ? (value === "" ? null : Number(value)) : value;
      return { ...prev, [key]: parsed };
    });
  }

  function updateTextField(key: TextFieldKey, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function updateTurnover(value: string) {
    setData((prev) => ({ ...prev, totalTurnover: value === "" ? null : Number(value) }));
  }

  function updateBlendedValue(value: string) {
    setData((prev) => ({
      ...prev,
      blendedRate: { ...prev.blendedRate, value: value === "" ? null : Number(value) },
    }));
  }

  function updateBlendedSource(value: string) {
    setData((prev) => ({
      ...prev,
      blendedRate: { ...prev.blendedRate, source: value === "" ? null : (value as "stated" | "calculated") },
    }));
  }

  function updateFeeList(listKey: "actualCharges" | "otherAdjustments", index: number, field: keyof FeeItem, value: string) {
    setData((prev) => {
      const list = [...prev[listKey]];
      const item = { ...list[index] };
      if (field === "amount") {
        item.amount = value === "" ? null : Number(value);
      } else {
        item.label = value;
      }
      list[index] = item;
      return { ...prev, [listKey]: list };
    });
  }

  function addFeeRow(listKey: "actualCharges" | "otherAdjustments") {
    setData((prev) => ({ ...prev, [listKey]: [...prev[listKey], { label: "", amount: null }] }));
  }

  function removeFeeRow(listKey: "actualCharges" | "otherAdjustments", index: number) {
    setData((prev) => ({ ...prev, [listKey]: prev[listKey].filter((_, i) => i !== index) }));
  }

  function updateRateCard(index: number, field: keyof RateCardItem, value: string) {
    setData((prev) => {
      const rateCard = [...prev.rateCard];
      rateCard[index] = { ...rateCard[index], [field]: value };
      return { ...prev, rateCard };
    });
  }

  function addRateCardRow() {
    setData((prev) => ({ ...prev, rateCard: [...prev.rateCard, { label: "", rate: "" }] }));
  }

  function removeRateCardRow(index: number) {
    setData((prev) => ({ ...prev, rateCard: prev.rateCard.filter((_, i) => i !== index) }));
  }

  function updateSchemeRate(index: number, field: keyof SchemeRate, value: string) {
    setData((prev) => {
      const schemeRates = [...prev.schemeRates];
      const item = { ...schemeRates[index] };
      if (field === "ratePercent") {
        item.ratePercent = value === "" ? null : Number(value);
      } else {
        item.scheme = value;
      }
      schemeRates[index] = item;
      return { ...prev, schemeRates };
    });
  }

  function addSchemeRateRow() {
    setData((prev) => ({ ...prev, schemeRates: [...prev.schemeRates, { scheme: "", ratePercent: null }] }));
  }

  function removeSchemeRateRow(index: number) {
    setData((prev) => ({ ...prev, schemeRates: prev.schemeRates.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!saveAvailable) return;
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, sourceFileName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save.");
      setSavedId(json.record.id);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setData(emptyExtractedData());
    setSourceFileName("");
    setError("");
    setSavedId("");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-8 py-12 sm:py-14 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">New Analysis</h1>
        <p className="text-sm text-neutral-500 mt-1.5">
          Upload a merchant statement (PDF or CSV) to extract its key figures.
        </p>
      </div>

      <Dropzone onFile={handleFile} disabled={status === "loading" || status === "saving"} />

      {status === "loading" && (
        <p className="text-sm text-neutral-500 -mt-4">Extracting data from statement…</p>
      )}

      {error && (
        <div className="border border-neutral-300 bg-neutral-50 text-sm text-neutral-700 px-4 py-3">
          {error}
        </div>
      )}

      {(status === "ready" || status === "saving" || status === "saved") && (
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3">
            <p className="text-sm text-neutral-500 min-w-0 truncate">
              Source file: <span className="text-neutral-800">{sourceFileName}</span>
            </p>
            <button
              onClick={reset}
              className="text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
            >
              Start over
            </button>
          </div>

          <SummaryCard
            data={data}
            totalActualCharges={sumActualCharges(data)}
            editable
            onTextFieldChange={updateTextField}
            onTurnoverChange={updateTurnover}
            onBlendedValueChange={updateBlendedValue}
            onBlendedSourceChange={updateBlendedSource}
          />

          <AccentDetails accent="amber" title="Full breakdown">
            <div className="flex flex-col gap-9">
              <section className={SECTION_ACCENTS.sky.wrapper}>
                <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.sky.label} mb-3`}>
                  Additional Details
                </h2>
                <div className="border border-neutral-200 divide-y divide-neutral-200 bg-white">
                  {FIELD_CONFIG.map((field) => (
                    <div key={field.key} className="grid grid-cols-2 items-center px-4 py-2.5 gap-4">
                      <label className="text-sm text-neutral-600">{field.label}</label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        value={data[field.key] ?? ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className={ROW_INPUT}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className={SECTION_ACCENTS.violet.wrapper}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.violet.label}`}>
                    Scheme Rates (stated)
                  </h2>
                  <button onClick={addSchemeRateRow} className={ADD_BUTTON}>
                    + Add row
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mb-3">
                  Scheme-by-scheme rates stated on the statement, where given (e.g. Visa/Mastercard vs.
                  other schemes).
                </p>
                <div className="border border-neutral-200 bg-white">
                  {data.schemeRates.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-400">No scheme-level rates stated.</p>
                  )}
                  {data.schemeRates.map((sr, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_100px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                    >
                      <input
                        type="text"
                        value={sr.scheme}
                        onChange={(e) => updateSchemeRate(index, "scheme", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={sr.ratePercent ?? ""}
                          onChange={(e) => updateSchemeRate(index, "ratePercent", e.target.value)}
                          className={ROW_INPUT}
                        />
                        <span className="text-sm text-neutral-400">%</span>
                      </div>
                      <button
                        onClick={() => removeSchemeRateRow(index)}
                        aria-label="Remove row"
                        className={REMOVE_BUTTON}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={SECTION_ACCENTS.orange.wrapper}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.orange.label}`}>
                    Rate Card
                  </h2>
                  <button onClick={addRateCardRow} className={ADD_BUTTON}>
                    + Add row
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mb-3">
                  Contracted rates the merchant is set up to pay per transaction type — not amounts
                  actually charged this period.
                </p>
                <div className="border border-neutral-200 bg-white">
                  {data.rateCard.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-400">No rate card detected.</p>
                  )}
                  {data.rateCard.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_120px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateRateCard(index, "label", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <input
                        type="text"
                        value={item.rate}
                        onChange={(e) => updateRateCard(index, "rate", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <button
                        onClick={() => removeRateCardRow(index)}
                        aria-label="Remove row"
                        className={REMOVE_BUTTON}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={SECTION_ACCENTS.rose.wrapper}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.rose.label}`}>
                    Actual Charges This Period
                  </h2>
                  <button onClick={() => addFeeRow("actualCharges")} className={ADD_BUTTON}>
                    + Add line item
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mb-3">
                  Itemised amounts actually deducted this statement period.
                </p>
                <div className="border border-neutral-200 bg-white">
                  <div className="grid grid-cols-[minmax(0,1fr)_140px_28px] gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-200 bg-neutral-50">
                    <span>Line item</span>
                    <span>Amount</span>
                    <span></span>
                  </div>
                  {data.actualCharges.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-400">No fee line items detected.</p>
                  )}
                  {data.actualCharges.map((fee, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_140px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                    >
                      <input
                        type="text"
                        value={fee.label}
                        onChange={(e) => updateFeeList("actualCharges", index, "label", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <input
                        type="number"
                        step="any"
                        value={fee.amount ?? ""}
                        onChange={(e) => updateFeeList("actualCharges", index, "amount", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <button
                        onClick={() => removeFeeRow("actualCharges", index)}
                        aria-label="Remove line item"
                        className={REMOVE_BUTTON}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={SECTION_ACCENTS.slate.wrapper}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`text-[11px] font-semibold uppercase tracking-wider ${SECTION_ACCENTS.slate.label}`}>
                    Other Adjustments
                  </h2>
                  <button onClick={() => addFeeRow("otherAdjustments")} className={ADD_BUTTON}>
                    + Add line item
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mb-3">
                  Rejected/resubmitted deposits, refunds, chargebacks. Not counted as fees or in the
                  blended rate.
                </p>
                <div className="border border-neutral-200 bg-white">
                  {data.otherAdjustments.length === 0 && (
                    <p className="px-4 py-3 text-sm text-neutral-400">No adjustments detected.</p>
                  )}
                  {data.otherAdjustments.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_140px_28px] gap-2 px-4 py-2 items-center border-b border-neutral-100 last:border-b-0"
                    >
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateFeeList("otherAdjustments", index, "label", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <input
                        type="number"
                        step="any"
                        value={item.amount ?? ""}
                        onChange={(e) => updateFeeList("otherAdjustments", index, "amount", e.target.value)}
                        className={ROW_INPUT}
                      />
                      <button
                        onClick={() => removeFeeRow("otherAdjustments", index)}
                        aria-label="Remove line item"
                        className={REMOVE_BUTTON}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </AccentDetails>

          <AccentDetails accent="teal" title="Partner Comparison (Internal)">
            <PartnerRanking data={data} />
          </AccentDetails>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleSave}
                disabled={status === "saving" || !saveAvailable}
                title={saveAvailable ? undefined : SAVE_UNAVAILABLE_MESSAGE}
                className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "saving" ? "Saving…" : "Save Statement"}
              </button>
              {status === "saved" && (
                <p className="text-sm text-neutral-600">
                  Saved as <span className="font-mono text-xs">{savedId}</span>.{" "}
                  <Link href={`/statements/${savedId}`} className="underline underline-offset-2">
                    View statement
                  </Link>{" "}
                  or{" "}
                  <Link href="/statements" className="underline underline-offset-2">
                    all statements
                  </Link>
                </p>
              )}
            </div>
            {!saveAvailable && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 max-w-md">
                {SAVE_UNAVAILABLE_MESSAGE}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
