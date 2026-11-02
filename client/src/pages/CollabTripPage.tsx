import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CollabTripPage() {
  const [, params] = useRoute("/collab/:id");
  const id = params?.id;
  const [trip, setTrip] = useState<{
    id: string;
    title: string;
    inviteCode: string;
    members: string[];
    days: Array<{ day: number; title: string; locationIds: string[] }>;
  } | null>(null);
  const [member, setMember] = useState("friend");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const res = await fetch(`/api/engagement/collab/trips/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setTrip(data.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [id]);

  const join = async () => {
    if (!trip) return;
    const res = await fetch(`/api/engagement/collab/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member, days: trip.days }),
    });
    const data = await res.json();
    if (res.ok) setTrip(data.data);
  };

  const addStop = async (day: number, locationId: string) => {
    if (!trip || !locationId.trim()) return;
    const days = trip.days.map((d) =>
      d.day === day ? { ...d, locationIds: [...d.locationIds, locationId.trim()] } : d,
    );
    const res = await fetch(`/api/engagement/collab/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member, days }),
    });
    const data = await res.json();
    if (res.ok) setTrip(data.data);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <h1 className="text-xl font-bold">Collaborative trip</h1>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-lg space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {trip && (
          <Card className="p-4 space-y-3">
            <p className="font-semibold">{trip.title}</p>
            <p className="text-xs text-muted-foreground">
              Invite code {trip.inviteCode} · members: {trip.members.join(", ")}
            </p>
            <div className="flex gap-2">
              <Input className="h-8 text-xs" value={member} onChange={(e) => setMember(e.target.value)} placeholder="Your name" />
              <Button size="sm" className="h-8" onClick={join}>
                Join
              </Button>
            </div>
            {trip.days.map((d) => (
              <div key={d.day} className="border rounded p-2 space-y-1 text-xs">
                <p className="font-medium">
                  Day {d.day}: {d.title}
                </p>
                <ul>
                  {d.locationIds.map((lid) => (
                    <li key={lid}>{lid}</li>
                  ))}
                </ul>
                <form
                  className="flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    addStop(d.day, String(fd.get("lid") || ""));
                    e.currentTarget.reset();
                  }}
                >
                  <Input name="lid" className="h-7 text-[10px]" placeholder="Add location id e.g. stone-town" />
                  <Button size="sm" className="h-7 text-[10px]" type="submit">
                    Add
                  </Button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
}
