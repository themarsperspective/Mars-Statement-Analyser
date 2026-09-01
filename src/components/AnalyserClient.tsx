"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Dropzone from "./Dropzone";
import SummaryCard from "./SummaryCard";
import FullBreakdown from "./results/FullBreakdown";
import PartnerComparison from "./results/PartnerComparison";
import BusinessClubReveal from "./results/BusinessClubReveal";
import { emptyExtractedData, ExtractedData, FeeItem, RateCardItem, SchemeRate } from "@/lib/types";
import { SAVE_UNAVAILABLE_MESSAGE } from "@/lib/deployment";
import { computeDeterministicScoring } from "@/lib/businessClub/scoring";
import { composeExplanation } from "@/lib/businessClub/compose";

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

export default function AnalyserClient({
  saveAvailable = true,
  isAuthed = false,
}: {
  saveAvailable?: boolean;
  isAuthed?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ExtractedData>(emptyExtractedData());
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [savedId, setSavedId] = useState<string>("");

  // Deterministic and local (no external API) — cheap enough to compute eagerly on
  // every edit, same as the saved-statement page. Only the DISPLAY is gated, via
  // BusinessClubReveal's click-to-open, not this computation.
  const businessClubScoring = useMemo(() => computeDeterministicScoring(data), [data]);
  const businessClubExplanations = useMemo(
    () =>
      businessClubScoring.ranked.map((s) =>
        composeExplanation(s.service, businessClubScoring.classification.industry, s.modifiersFired)
      ),
    [businessClubScoring]
  );

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
    <div className="mx-auto max-w-[950px] px-6 sm:px-10 lg:px-14 py-12 sm:py-14 flex flex-col gap-10">
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

          <FullBreakdown
            data={data}
            editable
            onFieldChange={updateField}
            onSchemeRateChange={updateSchemeRate}
            onAddSchemeRate={addSchemeRateRow}
            onRemoveSchemeRate={removeSchemeRateRow}
            onRateCardChange={updateRateCard}
            onAddRateCardRow={addRateCardRow}
            onRemoveRateCardRow={removeRateCardRow}
            onFeeChange={updateFeeList}
            onAddFeeRow={addFeeRow}
            onRemoveFeeRow={removeFeeRow}
          />

          {isAuthed && <PartnerComparison data={data} totalActualCharges={sumActualCharges(data)} />}

          <BusinessClubReveal scoring={businessClubScoring} explanations={businessClubExplanations} />

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
