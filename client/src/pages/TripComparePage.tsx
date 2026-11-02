import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import type { ItineraryTrip } from "@/components/ItineraryPanel";

export default function TripComparePage() {
  const trips = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("travelguide_compare_trips") || "[]") as ItineraryTrip[];
    } catch {
      return [];
    }
  }, []);
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);

  const left = trips[a];
  const right = trips[b];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <h1 className="text-xl font-bold">Compare trip plans</h1>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-4">
        {trips.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Save at least two itineraries via Tools → Itinerary → “Save to compare”.
          </p>
        ) : (
          <>
            <div className="flex gap-4 flex-wrap text-sm">
              <label>
                Plan A{" "}
                <select className="border rounded px-2 py-1" value={a} onChange={(e) => setA(Number(e.target.value))}>
                  {trips.map((t, i) => (
                    <option key={t.id} value={i}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plan B{" "}
                <select className="border rounded px-2 py-1" value={b} onChange={(e) => setB(Number(e.target.value))}>
                  {trips.map((t, i) => (
                    <option key={t.id} value={i}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[left, right].map((t, idx) => (
                <Card key={idx} className="p-4 space-y-2">
                  <p className="font-semibold">{t?.title}</p>
                  <p className="text-xs text-muted-foreground">{t?.summary}</p>
                  <ul className="text-xs space-y-1">
                    {t?.days.map((d) => (
                      <li key={d.day}>
                        <span className="font-medium">Day {d.day}:</span> {d.notes || d.stops?.map((s) => s.name).join(", ")}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground">Stops: {t?.days.reduce((n, d) => n + (d.stops?.length || 0), 0)}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
