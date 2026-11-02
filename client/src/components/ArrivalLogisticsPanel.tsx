import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ship, Loader2 } from "lucide-react";

interface ArrivalOption {
  id: string;
  kind: string;
  name: string;
  from: string;
  to: string;
  duration: string;
  priceUsd: number;
  priceLabel: string;
  notes: string;
  bookable: boolean;
}

interface ArrivalLogisticsPanelProps {
  onBook: (item: { id: string; name: string; type: "tour"; price: string }) => void;
}

export function ArrivalLogisticsPanel({ onBook }: ArrivalLogisticsPanelProps) {
  const [options, setOptions] = useState<ArrivalOption[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [pax, setPax] = useState(2);
  const [quote, setQuote] = useState<{ totalUsd: number; option: ArrivalOption } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/zanzibar/arrival")
      .then((r) => r.json())
      .then((d) => {
        setOptions(d.data?.options || []);
        setChecklist(d.data?.checklist || []);
      })
      .catch(() => undefined);
  }, []);

  const quoteOption = async (optionId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/zanzibar/arrival/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, passengers: pax }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setQuote({ totalUsd: d.data.totalUsd, option: d.data.option });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Ship className="w-3.5 h-3.5" aria-hidden />
        Arrival logistics
      </p>
      <p className="text-[10px] text-muted-foreground">Ferry · airport · transfers (confirm before book)</p>
      <label className="text-[10px] flex items-center gap-2">
        Passengers
        <Input type="number" min={1} max={12} className="h-7 w-16 text-xs" value={pax} onChange={(e) => setPax(Number(e.target.value) || 1)} />
      </label>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {options.map((o) => (
          <li key={o.id} className="text-[10px] border rounded-md p-2 space-y-1">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{o.name}</span>
              <span className="text-muted-foreground">{o.priceLabel}</span>
            </div>
            <p className="text-muted-foreground">
              {o.from} → {o.to} · {o.duration}
            </p>
            <p>{o.notes}</p>
            {o.bookable && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" disabled={loading} onClick={() => quoteOption(o.id)}>
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Get quote"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {quote && (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-2 space-y-1.5">
          <p className="text-[11px] font-medium">
            Quote: {quote.option.name} · ${quote.totalUsd} for {pax} pax
          </p>
          <Button
            size="sm"
            className="h-8 text-xs w-full"
            onClick={() =>
              onBook({
                id: quote.option.id,
                name: quote.option.name,
                type: "tour",
                price: `$${quote.totalUsd}`,
              })
            }
          >
            Confirm & book transfer
          </Button>
        </div>
      )}
      {checklist.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold">Arrival checklist</p>
          <ul className="text-[10px] text-muted-foreground list-disc list-inside">
            {checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
