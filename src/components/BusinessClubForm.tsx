"use client";

import { useMemo, useState } from "react";
import BusinessClubPanel from "./BusinessClubPanel";
import { scoreFromEvidence } from "@/lib/businessClub/scoring";
import { composeExplanation } from "@/lib/businessClub/compose";
import { gatherManualEvidence, ManualBusinessClubInput } from "@/lib/businessClub/evidence";
import { INDUSTRIES, OTHER_UNCLASSIFIED } from "@/lib/businessClub/config";
import { IndustryClassification } from "@/lib/businessClub/types";

// Object key order matches opportunity-matrix.json's industries block, so
// "Other / Unclassified" (relabelled below) naturally sorts last, same as
// the JSON's own ordering — no separate list to keep in sync.
const INDUSTRY_OPTIONS = Object.keys(INDUSTRIES).map((industry) => ({
  value: industry,
  label: industry === OTHER_UNCLASSIFIED ? "Not sure / Other" : industry,
}));

const inputBase =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors";
const labelBase = "text-sm font-medium text-neutral-700";

type ToggleValue = "yes" | "no" | "";

export default function BusinessClubForm() {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [turnover, setTurnover] = useState("");
  const [terminals, setTerminals] = useState("");
  const [cnpPercent, setCnpPercent] = useState("");
  const [employees, setEmployees] = useState("");
  const [soleTrader, setSoleTrader] = useState<ToggleValue>("");
  const [multiSite, setMultiSite] = useState<ToggleValue>("");
  const [submitted, setSubmitted] = useState(false);

  // Deterministic and local — recomputed from the same scoring engine used
  // for statement-based Business Club, just with a manually-built
  // classification (direct industry selection, bypassing MCC/name
  // inference) and evidence (gatherManualEvidence) instead of an
  // ExtractedData statement.
  const result = useMemo(() => {
    if (!submitted || !industry) return null;

    const classification: IndustryClassification = {
      industry,
      confidence: "high",
      basis: "Manually selected",
    };
    const input: ManualBusinessClubInput = {
      monthlyCardTurnover: turnover === "" ? null : Number(turnover),
      terminalCount: terminals === "" ? null : Number(terminals),
      cnpPercent: cnpPercent === "" ? null : Number(cnpPercent),
      employeeCount: employees === "" ? null : Number(employees),
      soleTrader: soleTrader === "" ? null : soleTrader === "yes",
      multiSiteConfirmed: multiSite === "" ? null : multiSite === "yes",
    };

    const scoring = scoreFromEvidence(classification, gatherManualEvidence(input));
    const explanations = scoring.ranked.map((s) =>
      composeExplanation(s.service, scoring.classification.industry, s.modifiersFired)
    );
    return { scoring, explanations };
  }, [submitted, industry, turnover, terminals, cnpPercent, employees, soleTrader, multiSite]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!industry) return;
    setSubmitted(true);
  }

  function reset() {
    setSubmitted(false);
    setBusinessName("");
    setIndustry("");
    setTurnover("");
    setTerminals("");
    setCnpPercent("");
    setEmployees("");
    setSoleTrader("");
    setMultiSite("");
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Business Club</h1>
        <p className="text-sm text-neutral-500 mt-1.5">
          Quick manual lookup — enter what you know about the business, leave the rest blank.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-neutral-200 bg-white p-6 sm:p-7 flex flex-col gap-5">
        <Field label="Business name (optional)">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputBase}
            placeholder="For display only — not used in scoring"
          />
        </Field>

        <Field label="Industry" required>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputBase} required>
            <option value="" disabled>
              Select an industry…
            </option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Approx. monthly card turnover (£, optional)">
            <input
              type="number"
              min="0"
              step="any"
              value={turnover}
              onChange={(e) => setTurnover(e.target.value)}
              className={inputBase}
              placeholder="e.g. 80000"
            />
          </Field>
          <Field label="Number of terminals (optional)">
            <input
              type="number"
              min="0"
              step="1"
              value={terminals}
              onChange={(e) => setTerminals(e.target.value)}
              className={inputBase}
              placeholder="e.g. 2"
            />
          </Field>
          <Field label="% of sales online/phone, i.e. CNP (optional)">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={cnpPercent}
              onChange={(e) => setCnpPercent(e.target.value)}
              className={inputBase}
              placeholder="e.g. 15"
            />
          </Field>
          <Field label="Number of employees (optional)">
            <input
              type="number"
              min="0"
              step="1"
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
              className={inputBase}
              placeholder="e.g. 8"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Sole trader? (optional)">
            <ToggleGroup value={soleTrader} onChange={setSoleTrader} />
          </Field>
          <Field label="Confirmed multi-site business? (optional)">
            <ToggleGroup value={multiSite} onChange={setMultiSite} />
          </Field>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!industry}
            className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Business Club
          </button>
          {submitted && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      </form>

      {result && (
        <div className="border border-fuchsia-200 bg-white">
          <div className="px-5 py-3.5 bg-fuchsia-50 border-b border-fuchsia-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800">
              {businessName ? `Business Club — ${businessName}` : "Business Club"}
            </span>
          </div>
          <div className="p-5 bg-white">
            <BusinessClubPanel scoring={result.scoring} explanations={result.explanations} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelBase}>
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function ToggleGroup({ value, onChange }: { value: ToggleValue; onChange: (v: ToggleValue) => void }) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(value === v ? "" : v)}
          className={`px-4 py-2 text-sm font-medium border transition-colors ${
            value === v
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500"
          }`}
        >
          {v === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}
