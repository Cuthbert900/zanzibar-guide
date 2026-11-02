import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Route, Share2 } from "lucide-react";
import type { MapLocation } from "@/components/ChatMap";
import { CATALOG_LOCATIONS } from "@shared/catalog";

function haversineKm(a: MapLocation, b: MapLocation): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

interface RoutePlannerPanelProps {
  favorites: MapLocation[];
  onRouteBuilt: (stops: MapLocation[]) => void;
}

export function RoutePlannerPanel({ favorites, onRouteBuilt }: RoutePlannerPanelProps) {
  const pool = useMemo(() => {
    const fromCatalog = CATALOG_LOCATIONS.filter((l) => l.type === "attraction" || l.type === "hotel").map(
      (l) =>
        ({
          id: l.id,
          name: l.name,
          type: l.type,
          lat: l.lat,
          lng: l.lng,
          description: l.description,
          price: l.price,
          hours: l.hours,
        }) as MapLocation,
    );
    const byId = new Map<string, MapLocation>();
    [...fromCatalog, ...favorites].forEach((l) => byId.set(l.id, l));
    return Array.from(byId.values());
  }, [favorites]);

  const [selected, setSelected] = useState<string[]>(() => pool.slice(0, 3).map((p) => p.id));
  const [mode, setMode] = useState<"car" | "walk" | "daladala">("car");
  const [manualOrder, setManualOrder] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const ordered = useMemo(() => {
    const picks = selected.map((id) => pool.find((p) => p.id === id)).filter(Boolean) as MapLocation[];
    if (picks.length < 2 || manualOrder) return picks;
    const remaining = [...picks];
    const route: MapLocation[] = [remaining.shift()!];
    while (remaining.length) {
      const last = route[route.length - 1];
      remaining.sort((a, b) => haversineKm(last, a) - haversineKm(last, b));
      route.push(remaining.shift()!);
    }
    return route;
  }, [selected, pool, manualOrder]);

  const totalKm = useMemo(() => {
    let t = 0;
    for (let i = 1; i < ordered.length; i++) t += haversineKm(ordered[i - 1], ordered[i]);
    return Math.round(t * 10) / 10;
  }, [ordered]);

  const speed = mode === "car" ? 45 : mode === "daladala" ? 30 : 4;
  const etaHours = totalKm / speed;
  const fuelOrFareUsd = mode === "walk" ? 0 : mode === "daladala" ? Math.max(2, Math.round(totalKm * 0.4)) : Math.max(8, Math.round(totalKm * 0.9));

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 8)));
  };

  const move = (index: number, dir: -1 | 1) => {
    setManualOrder(true);
    setSelected((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const share = async () => {
    const text = `Zanzibar route (${mode}): ${ordered.map((s) => s.name).join(" → ")} · ${totalKm} km · ~$${fuelOrFareUsd}`;
    try {
      if (navigator.share) await navigator.share({ title: "Zanzibar route", text });
      else {
        await navigator.clipboard.writeText(text);
        setShareMsg("Copied route to clipboard");
      }
    } catch {
      setShareMsg(text);
    }
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Route className="w-3.5 h-3.5" aria-hidden />
        Route planner
      </p>
      <p className="text-[10px] text-muted-foreground">Reorder stops · cost estimate · share</p>
      <div className="flex gap-1 flex-wrap">
        {(["car", "daladala", "walk"] as const).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setMode(m)}>
            {m === "car" ? "Drive" : m === "daladala" ? "Daladala" : "Walk"}
          </Button>
        ))}
        <Button size="sm" variant={manualOrder ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setManualOrder((v) => !v)}>
          {manualOrder ? "Manual order" : "Auto nearest"}
        </Button>
      </div>
      <ul className="max-h-28 overflow-y-auto space-y-1 text-[10px]">
        {pool.slice(0, 12).map((loc) => (
          <li key={loc.id}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.includes(loc.id)} onChange={() => toggle(loc.id)} />
              <span>{loc.name}</span>
            </label>
          </li>
        ))}
      </ul>
      {ordered.length > 0 && (
        <ol className="text-[10px] space-y-1">
          {ordered.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span className="flex-1">
                {i + 1}. {s.name}
                {i > 0 ? ` · ${haversineKm(ordered[i - 1], s)} km` : ""}
              </span>
              {manualOrder && (
                <>
                  <button type="button" className="p-0.5" aria-label="Move up" onClick={() => move(i, -1)}>
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button type="button" className="p-0.5" aria-label="Move down" onClick={() => move(i, 1)}>
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="text-[10px] text-muted-foreground">
        {totalKm} km · ~{etaHours.toFixed(1)} h · est. cost ${fuelOrFareUsd} ({mode})
      </p>
      <div className="flex gap-1">
        <Button size="sm" className="h-8 text-xs flex-1" disabled={ordered.length < 2} onClick={() => onRouteBuilt(ordered)}>
          Plot route on map
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={ordered.length < 2} onClick={share}>
          <Share2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {shareMsg && <p className="text-[10px] text-muted-foreground">{shareMsg}</p>}
    </Card>
  );
}
