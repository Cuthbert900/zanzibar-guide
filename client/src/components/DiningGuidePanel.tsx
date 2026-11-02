import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Utensils } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Venue {
  id: string;
  name: string;
  cuisine: string;
  dietary: string[];
  avgMealUsd: number;
  popularDishes: string[];
  description: string;
  reservationNote?: string;
  wheelchairAccessible?: boolean;
}

export function DiningGuidePanel() {
  const { formatMoney, currency, convertToUsd } = useCurrency();
  const [cuisine, setCuisine] = useState("");
  const [dietary, setDietary] = useState("");
  const [maxMeal, setMaxMeal] = useState("");
  const [rows, setRows] = useState<Venue[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (cuisine) params.set("cuisine", cuisine);
    if (dietary) params.set("dietary", dietary);
    if (maxMeal) params.set("maxMeal", String(Math.round(convertToUsd(Number(maxMeal) || 0))));
    const res = await fetch(`/api/engagement/dining?${params}`);
    const data = await res.json();
    setRows(data.data || []);
    setStatus(`${data.count || 0} restaurants`);
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Utensils className="w-3.5 h-3.5" /> Dining & cuisine guide
      </p>
      <div className="grid grid-cols-3 gap-1">
        <select className="h-7 text-[10px] border rounded px-1 bg-background" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
          <option value="">Cuisine</option>
          <option value="local">Local</option>
          <option value="international">International</option>
          <option value="seafood">Seafood</option>
          <option value="cafe">Café</option>
          <option value="fine-dining">Fine dining</option>
        </select>
        <select className="h-7 text-[10px] border rounded px-1 bg-background" value={dietary} onChange={(e) => setDietary(e.target.value)}>
          <option value="">Dietary</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="halal">Halal</option>
          <option value="kosher">Kosher</option>
          <option value="gluten-free">Gluten-free</option>
        </select>
        <Input
          className="h-7 text-[10px]"
          type="number"
          placeholder={`Max ${currency}`}
          value={maxMeal}
          onChange={(e) => setMaxMeal(e.target.value)}
          aria-label={`Max meal (${currency})`}
        />
      </div>
      <Button size="sm" className="h-7 text-[10px] w-full" onClick={load}>
        Filter restaurants
      </Button>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
      <ul className="max-h-40 overflow-y-auto space-y-1.5 text-[10px]">
        {rows.map((r) => (
          <li key={r.id} className="border rounded px-2 py-1.5">
            <p className="font-medium">
              {r.name} · {formatMoney(r.avgMealUsd)} avg
              {r.wheelchairAccessible ? " · ♿" : ""}
            </p>
            <p className="text-muted-foreground">{r.description}</p>
            <p>Dishes: {r.popularDishes.join(", ")}</p>
            <p className="text-muted-foreground">{r.reservationNote}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
