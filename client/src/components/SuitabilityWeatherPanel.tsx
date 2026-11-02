import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CloudSun, Loader2 } from "lucide-react";
import { CATALOG_LOCATIONS } from "@shared/catalog";

interface DayRow {
  date: string;
  dayLabel: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  windMaxKph: number;
  score: number;
  label: "optimal" | "good" | "moderate" | "indoor";
  tip: string;
}

const LABEL_STYLE: Record<string, string> = {
  optimal: "bg-emerald-100 text-emerald-800",
  good: "bg-sky-100 text-sky-800",
  moderate: "bg-amber-100 text-amber-900",
  indoor: "bg-muted text-muted-foreground",
};

export function SuitabilityWeatherPanel({ locationId }: { locationId?: string }) {
  const [id, setId] = useState(locationId || "nungwi");
  const [days, setDays] = useState<DayRow[]>([]);
  const [meta, setMeta] = useState<{ name: string; activity: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const attractions = CATALOG_LOCATIONS.filter((l) => l.type === "attraction");

  const load = async (locId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/zanzibar/suitability?locationId=${encodeURIComponent(locId)}&days=5`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setDays(d.data.days || []);
      setMeta({ name: d.data.locationName, activity: d.data.activityHint });
      setId(locId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weather failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(locationId || id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <CloudSun className="w-3.5 h-3.5" aria-hidden />
        Visit suitability weather
      </p>
      <p className="text-[10px] text-muted-foreground">Multi-day score for beaches, boats & outdoor plans</p>
      <select
        className="w-full h-8 text-[10px] border rounded-md px-2 bg-background"
        value={id}
        onChange={(e) => load(e.target.value)}
      >
        {attractions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <Button size="sm" className="h-8 text-xs w-full" disabled={loading} onClick={() => load(id)}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Refresh forecast
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {meta && (
        <p className="text-[10px] text-muted-foreground">
          {meta.name} · best for <span className="text-foreground font-medium">{meta.activity}</span>
        </p>
      )}
      <ul className="space-y-1.5">
        {days.map((d) => (
          <li key={d.date} className="rounded-md border border-border/60 p-2 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{d.dayLabel}</span>
              <span className={`px-1.5 py-0.5 rounded ${LABEL_STYLE[d.label]}`}>
                {d.score}/100 · {d.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5">
              {d.tempMinC}–{d.tempMaxC}°C · rain {d.precipMm}mm · wind {d.windMaxKph} km/h
            </p>
            <p className="mt-0.5">{d.tip}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
