import { useEffect, useState } from "react";
import { Bell, CloudSun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CitationSource } from "@shared/sources";
import { SourceChips } from "@/components/SourceChips";

interface Nudge {
  id: string;
  priority: "info" | "watch" | "urgent";
  title: string;
  body: string;
  when: string;
}

interface CompanionPanelProps {
  locationIds?: string[];
}

export function CompanionPanel({ locationIds }: CompanionPanelProps) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [fx, setFx] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const locQs = locationIds?.length ? `&locations=${locationIds.join(",")}` : "";
      const [nRes, fxRes] = await Promise.all([
        fetch(`/api/companion/nudges?${locQs}`),
        fetch("/api/live/fx?base=USD&symbols=EUR,GBP,ZAR"),
      ]);
      const nData = await nRes.json();
      setNudges(nData.data?.nudges || []);
      setSources(nData.data?.sources || []);
      if (fxRes.ok) {
        const f = await fxRes.json();
        const rates = f.data?.rates || {};
        setFx(
          `USD→EUR ${rates.EUR ?? "—"} · GBP ${rates.GBP ?? "—"} · ZAR ${rates.ZAR ?? "—"}`,
        );
        if (f.data?.sources) setSources((prev) => [...prev, ...f.data.sources]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationIds?.join(",")]);

  return (
    <Card className="p-3 border-border/50 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1">
          <Bell className="w-3.5 h-3.5" aria-hidden />
          Trip companion
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>
      {fx && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CloudSun className="w-3 h-3" aria-hidden />
          {fx}
        </p>
      )}
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {nudges.map((n) => (
          <li
            key={n.id}
            className={`text-xs rounded-md border px-2 py-1.5 ${
              n.priority === "urgent"
                ? "border-red-300 bg-red-50"
                : n.priority === "watch"
                  ? "border-amber-300 bg-amber-50"
                  : "border-border/60 bg-muted/30"
            }`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-muted-foreground mt-0.5">{n.body}</p>
            <p className="text-[10px] mt-1 opacity-70">{n.when}</p>
          </li>
        ))}
        {!nudges.length && <li className="text-[10px] text-muted-foreground">No nudges yet</li>}
      </ul>
      <SourceChips sources={sources.slice(0, 4)} />
    </Card>
  );
}
