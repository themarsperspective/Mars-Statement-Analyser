import Chevron from "./Chevron";

const ACCENTS = {
  amber: {
    border: "border-amber-300 border-t-amber-500",
    bg: "bg-amber-50/70",
    label: "text-amber-800",
    hover: "hover:bg-amber-100/60",
  },
  teal: {
    border: "border-teal-300 border-t-teal-500",
    bg: "bg-teal-50/70",
    label: "text-teal-800",
    hover: "hover:bg-teal-100/60",
  },
} as const;

export default function AccentDetails({
  accent,
  title,
  children,
  defaultOpen,
}: {
  accent: keyof typeof ACCENTS;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <details
      className={`group border border-t-4 ${a.border}`}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary
        className={`cursor-pointer select-none list-none px-5 py-4 flex items-center justify-between transition-colors ${a.bg} ${a.hover}`}
      >
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${a.label}`}>{title}</span>
        <Chevron />
      </summary>
      <div className="border-t border-neutral-200 p-5 sm:p-6 bg-white">{children}</div>
    </details>
  );
}
