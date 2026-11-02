import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Luggage } from "lucide-react";

interface PackItem {
  id: string;
  name: string;
  category: string;
  packed: boolean;
  reason?: string;
}

export function PackingListPanel() {
  const [destination, setDestination] = useState("Zanzibar beaches & Stone Town");
  const [days, setDays] = useState("4");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [climateNote, setClimateNote] = useState<string | null>(null);
  const [items, setItems] = useState<PackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      let weatherBit = "";
      try {
        const w = await fetch("/api/live/weather").then((r) => r.json());
        if (w.data) {
          weatherBit = ` Current weather: ${w.data.summary}, ${w.data.tempC}°C, wind ${w.data.windKph} km/h.`;
          setClimateNote((prev) => prev || `${w.data.summary} · ${w.data.tempC}°C`);
        }
      } catch {
        /* optional */
      }
      const res = await fetch("/api/packing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination + weatherBit,
          days: Number(days) || 4,
          tripType: "leisure",
          activities: ["Safari", "Waterfalls", "Culture"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSummary(data.data.summary);
      setClimateNote(data.data.climateNote + (weatherBit ? ` · Live:${weatherBit}` : ""));
      setItems(data.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, packed: !it.packed } : it)));
  };

  const packed = items.filter((i) => i.packed).length;

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Luggage className="w-3.5 h-3.5" aria-hidden />
        Packing list
      </p>
      <Input className="h-8 text-xs" value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destination" />
      <div className="flex gap-2">
        <Input className="h-8 w-16 text-xs" type="number" min={1} max={14} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Days" />
        <Button size="sm" className="h-8 text-xs flex-1" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {summary && <p className="text-[10px] text-muted-foreground">{summary}</p>}
      {climateNote && <p className="text-[10px]">{climateNote}</p>}
      {items.length > 0 && (
        <>
          <p className="text-[10px] font-medium">
            Packed {packed}/{items.length}
          </p>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-[10px]">
            {items.map((it) => (
              <li key={it.id}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={it.packed} onChange={() => toggle(it.id)} className="mt-0.5" />
                  <span>
                    <span className={it.packed ? "line-through opacity-60" : ""}>{it.name}</span>
                    <span className="text-muted-foreground"> · {it.category}</span>
                    {it.reason && <span className="block text-muted-foreground">{it.reason}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
