import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MapLocation } from "@/components/ChatMap";

interface OpenDataSearchProps {
  onResults: (locs: MapLocation[]) => void;
}

/** Live OSM Nominatim connector demo */
export function OpenDataSearch({ onResults }: OpenDataSearchProps) {
  const [q, setQ] = useState("Zanzibar Stone Town");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/opendata/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      const locs = (data.data || []) as MapLocation[];
      onResults(locs);
      setStatus(`Live OSM: ${locs.length} results`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold">Live open data (OSM Nominatim)</p>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs" />
        <Button size="sm" className="h-8 text-xs" onClick={search} disabled={loading}>
          {loading ? "…" : "Search"}
        </Button>
      </div>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
    </Card>
  );
}
