export default function OtherProvidersCompact({ otherOptions }: { otherOptions: string[] }) {
  if (otherOptions.length === 0) return null;

  return (
    <details className="group border border-neutral-200 bg-white">
      <summary className="cursor-pointer select-none list-none px-5 py-3.5 flex items-center justify-between gap-2 transition-colors bg-white hover:bg-neutral-50">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Other Supported Providers ({otherOptions.length})
        </span>
        <span className="text-neutral-300 text-sm transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-neutral-200 bg-white px-5 py-4">
        <p className="text-sm text-neutral-500 mb-2">
          Pricing is not currently configured for these providers, so they are excluded from the comparison above.
        </p>
        <p className="text-base text-neutral-600">{otherOptions.join(" · ")}</p>
      </div>
    </details>
  );
}
