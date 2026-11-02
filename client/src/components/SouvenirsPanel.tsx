import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";

interface Souvenir {
  id: string;
  name: string;
  craft: string;
  priceUsd: number;
  matchReason: string;
  relatedAttraction?: string;
}

interface SouvenirsPanelProps {
  attractionIds?: string[];
}

export function SouvenirsPanel({ attractionIds }: SouvenirsPanelProps) {
  const [items, setItems] = useState<Souvenir[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/souvenirs/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attractionIds, interests: ["culture", "nature"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setItems(data.data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Gift className="w-3.5 h-3.5" aria-hidden />
        Artisan souvenirs
      </p>
      <Button size="sm" className="h-8 text-xs w-full" onClick={load} disabled={loading}>
        {loading ? "Finding…" : "Recommend crafts"}
      </Button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((it) => (
          <li key={it.id} className="text-[10px] border rounded-md p-2">
            <p className="font-medium">{it.name}</p>
            <p className="text-muted-foreground">
              {it.craft} · ${it.priceUsd}
            </p>
            <p className="mt-0.5">{it.matchReason}</p>
            {it.relatedAttraction && <p className="text-muted-foreground">For: {it.relatedAttraction}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
