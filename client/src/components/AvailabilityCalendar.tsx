import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CitationSource } from "@shared/sources";
import { SourceChips } from "@/components/SourceChips";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface Day {
  date: string;
  available: boolean;
  remaining: number;
  priceUsd: number;
  priceLabel: string;
}

interface AvailabilityCalendarProps {
  itemId: string;
  itemName?: string;
  onSelectDate?: (day: Day) => void;
}

export function AvailabilityCalendar({ itemId, itemName, onSelectDate }: AvailabilityCalendarProps) {
  const { formatMoney, formatPriceLabel } = useCurrency();
  const { t } = useLanguage();
  const [days, setDays] = useState<Day[]>([]);
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetch(`/api/inventory/${encodeURIComponent(itemId)}?from=${from}&days=14`)
      .then((r) => r.json())
      .then((d) => {
        setDays(d.data?.days || []);
        setSources(d.data?.sources || []);
      })
      .catch(() => {});
  }, [itemId, from]);

  const best = days.filter((d) => d.available).reduce((m, d) => Math.min(m, d.priceUsd), Number.POSITIVE_INFINITY);

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{t("liveAvailability")} · {itemName || itemId}</p>
        <Input
          type="date"
          aria-label="Inventory start date"
          className="h-7 w-auto text-[10px]"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      {Number.isFinite(best) && (
        <p className="text-[10px] text-emerald-700 font-medium">{t("bestPriceWindow")}: {formatMoney(best)}</p>
      )}
      <div className="grid grid-cols-7 gap-1" role="list" aria-label="Availability calendar">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            role="listitem"
            disabled={!d.available}
            onClick={() => onSelectDate?.(d)}
            className={`rounded border p-1 text-[9px] leading-tight text-left ${
              d.available
                ? d.priceUsd === best
                  ? "border-amber-400 bg-amber-50 hover:bg-amber-100"
                  : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                : "border-border bg-muted/40 opacity-50 cursor-not-allowed"
            }`}
            aria-label={`${d.date} ${d.available ? formatPriceLabel(d.priceLabel) : "sold out"}`}
          >
            <div className="font-medium">{d.date.slice(5)}</div>
            <div>{d.available ? formatMoney(d.priceUsd) : t("soldOut")}</div>
            {d.available && <div className="opacity-70">{d.remaining} {t("left")}</div>}
            {d.available && d.priceUsd === best && <div className="text-amber-700 font-semibold">{t("best")}</div>}
          </button>
        ))}
      </div>
      <SourceChips sources={sources} />
    </Card>
  );
}
