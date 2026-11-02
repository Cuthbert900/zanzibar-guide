import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { MapLocation } from "@/components/ChatMap";

interface BudgetCalculatorPanelProps {
  activityCandidates?: MapLocation[];
}

export function BudgetCalculatorPanel({ activityCandidates = [] }: BudgetCalculatorPanelProps) {
  const { formatMoney, currency, convertToUsd } = useCurrency();
  const [days, setDays] = useState("4");
  const [party, setParty] = useState("2");
  const [lodging, setLodging] = useState("150");
  const [meals, setMeals] = useState("35");
  const [transport, setTransport] = useState("40");
  const [misc, setMisc] = useState("25");
  const [contingency, setContingency] = useState("10");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [result, setResult] = useState<{
    total: number;
    perPerson: number;
    perDay: number;
    breakdown: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const picks = useMemo(
    () => activityCandidates.filter((a) => a.type === "attraction").slice(0, 8),
    [activityCandidates],
  );

  const toggle = (id: string) => {
    setSelectedActivities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const estimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budget/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: Number(days) || 4,
          partySize: Number(party) || 2,
          lodgingPerNight: convertToUsd(Number(lodging) || 0),
          mealsPerDayPerPerson: convertToUsd(Number(meals) || 0),
          transportPerDay: convertToUsd(Number(transport) || 0),
          miscPerDay: convertToUsd(Number(misc) || 0),
          contingencyPct: Number(contingency) || 10,
          activityIds: selectedActivities,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({
        total: data.data.total,
        perPerson: data.data.perPerson,
        perDay: data.data.perDay,
        breakdown: data.data.breakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Calculator className="w-3.5 h-3.5" aria-hidden />
        Trip budget calculator
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] space-y-0.5">
          Days
          <Input className="h-8 text-xs" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5">
          Party size
          <Input className="h-8 text-xs" type="number" min={1} value={party} onChange={(e) => setParty(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5">
          Lodging / night ({currency})
          <Input className="h-8 text-xs" type="number" min={0} value={lodging} onChange={(e) => setLodging(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5">
          Meals / person / day ({currency})
          <Input className="h-8 text-xs" type="number" min={0} value={meals} onChange={(e) => setMeals(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5">
          Transport / day ({currency})
          <Input className="h-8 text-xs" type="number" min={0} value={transport} onChange={(e) => setTransport(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5">
          Misc / day ({currency})
          <Input className="h-8 text-xs" type="number" min={0} value={misc} onChange={(e) => setMisc(e.target.value)} />
        </label>
        <label className="text-[10px] space-y-0.5 col-span-2">
          Contingency %
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            max={40}
            value={contingency}
            onChange={(e) => setContingency(e.target.value)}
          />
        </label>
      </div>
      {picks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium">Include entry fees</p>
          <div className="flex flex-wrap gap-1">
            {picks.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`text-[10px] px-2 py-0.5 rounded-md border ${
                  selectedActivities.includes(p.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button size="sm" className="h-8 text-xs w-full" onClick={estimate} disabled={loading}>
        {loading ? "Calculating…" : "Estimate budget"}
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {result && (
        <div className="text-[10px] space-y-1 rounded-md border bg-muted/30 p-2">
          <p className="font-semibold text-sm text-foreground">
            Total {formatMoney(result.total)}{" "}
            <span className="text-muted-foreground font-normal text-[10px]">(live FX · {currency})</span>
          </p>
          <p>
            Per person {formatMoney(result.perPerson)} · Per day {formatMoney(result.perDay)}
          </p>
          <ul className="text-muted-foreground">
            {Object.entries(result.breakdown).map(([k, v]) => (
              <li key={k}>
                {k}: {formatMoney(v)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
