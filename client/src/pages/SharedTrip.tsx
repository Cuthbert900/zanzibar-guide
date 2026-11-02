import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { BRAND } from "@shared/travel";

interface Trip {
  id: string;
  title: string;
  summary: string;
  days: Array<{ day: number; title: string; notes?: string }>;
  createdAt: string;
}

export default function SharedTrip() {
  const [, params] = useRoute("/trip/:id");
  const id = params?.id;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share/trips/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setTrip(d.data);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <div>
            <h1 className="text-xl font-bold">Shared itinerary</h1>
            <p className="text-xs text-muted-foreground">Read-only · {BRAND.name}</p>
          </div>
          <Link href="/" className="text-sm text-primary hover:underline">
            Open chat
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {trip && (
          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">{trip.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.summary}</p>
            <ul className="space-y-3">
              {trip.days.map((d) => (
                <li key={d.day} className="border-l-2 border-primary pl-3">
                  <p className="font-semibold text-sm">
                    Day {d.day}: {d.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.notes}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
