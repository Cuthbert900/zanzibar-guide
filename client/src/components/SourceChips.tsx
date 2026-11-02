import type { CitationSource } from "@shared/sources";

const KIND_LABEL: Record<string, string> = {
  cms: "CMS",
  faq: "FAQ",
  alert: "Alert",
  opendata: "Open data",
  brochure: "Brochure",
  "tourism-data": "Tourism data",
  weather: "Weather",
  fx: "FX",
  vision: "Vision",
  inventory: "Inventory",
};

export function SourceChips({ sources }: { sources?: CitationSource[] }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Answer sources">
      {sources.slice(0, 8).map((s) => {
        const conf = s.confidence || "medium";
        const confClass =
          conf === "high"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : conf === "low"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-sky-50 text-sky-900 border-sky-200";
        return (
          <span
            key={s.id}
            className={`inline-flex items-center gap-1 max-w-full rounded-md border px-2 py-0.5 text-[10px] ${confClass}`}
            title={`${s.detail || s.title} · confidence ${conf}`}
          >
            <span className="font-semibold">{KIND_LABEL[s.kind] || s.kind}</span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                {s.title}
                {s.page != null ? ` p.${s.page}` : ""}
              </a>
            ) : (
              <span className="truncate">
                {s.title}
                {s.page != null ? ` p.${s.page}` : ""}
              </span>
            )}
            <span className="uppercase tracking-wide opacity-70">{conf}</span>
          </span>
        );
      })}
    </div>
  );
}
