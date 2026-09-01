// Shared accent-colour treatments for the data sub-sections inside "Full
// breakdown", used identically on the New Analysis screen and the saved
// statement detail page so the same data type always reads the same colour.
// Backgrounds are fully opaque (no /NN alpha) — these sit over the Mars
// background texture and must never let it show through behind their text.
export const SECTION_ACCENTS = {
  sky: {
    wrapper: "border-l-4 border-sky-400 bg-sky-50 pl-4 sm:pl-5 pr-3 py-4",
    label: "text-sky-800",
  },
  violet: {
    wrapper: "border-l-4 border-violet-400 bg-violet-50 pl-4 sm:pl-5 pr-3 py-4",
    label: "text-violet-800",
  },
  orange: {
    wrapper: "border-l-4 border-orange-400 bg-orange-50 pl-4 sm:pl-5 pr-3 py-4",
    label: "text-orange-800",
  },
  rose: {
    wrapper: "border-l-4 border-rose-400 bg-rose-50 pl-4 sm:pl-5 pr-3 py-4",
    label: "text-rose-800",
  },
  slate: {
    wrapper: "border-l-4 border-slate-300 bg-slate-50 pl-4 sm:pl-5 pr-3 py-4",
    label: "text-slate-700",
  },
} as const;

export type SectionAccentKey = keyof typeof SECTION_ACCENTS;
