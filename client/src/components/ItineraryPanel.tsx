import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import type { MapLocation } from "@/components/ChatMap";
import { getSessionId } from "@/lib/session";

export interface ItineraryTrip {
  id: string;
  title: string;
  summary: string;
  days: Array<{
    day: number;
    title: string;
    notes?: string;
    stops: MapLocation[];
  }>;
}

interface Leg {
  from: string;
  to: string;
  km: number;
  driveMin: number;
  walkMin: number | null;
}

interface ItineraryPanelProps {
  onTripBuilt?: (trip: ItineraryTrip) => void;
}

export function ItineraryPanel({ onTripBuilt }: ItineraryPanelProps) {
  const [prompt, setPrompt] = useState("3 days: Stone Town + spice tour + Nungwi");
  const [days, setDays] = useState("3");
  const [trip, setTrip] = useState<ItineraryTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [collabUrl, setCollabUrl] = useState<string | null>(null);
  const [legsByDay, setLegsByDay] = useState<Record<number, Leg[]>>({});
  const [drag, setDrag] = useState<{ day: number; index: number } | null>(null);

  const computeLegs = async (t: ItineraryTrip) => {
    const map: Record<number, Leg[]> = {};
    for (const d of t.days) {
      const stops = d.stops || [];
      if (stops.length < 2) {
        map[d.day] = [];
        continue;
      }
      const res = await fetch("/api/engagement/travel-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: stops.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng })),
        }),
      });
      const data = await res.json();
      map[d.day] = data.data?.legs || [];
    }
    setLegsByDay(map);
  };

  const build = async () => {
    setLoading(true);
    setError(null);
    setShareUrl(null);
    setCollabUrl(null);
    try {
      const token = localStorage.getItem("travelguide_token");
      const res = await fetch("/api/itinerary/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, days: Number(days) || 3, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTrip(data.data);
      onTripBuilt?.(data.data);
      await computeLegs(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const moveStop = (dayNum: number, fromIdx: number, toIdx: number) => {
    if (!trip || fromIdx === toIdx) return;
    const next = {
      ...trip,
      days: trip.days.map((d) => {
        if (d.day !== dayNum) return d;
        const stops = [...(d.stops || [])];
        const [item] = stops.splice(fromIdx, 1);
        stops.splice(toIdx, 0, item);
        return { ...d, stops, notes: stops.map((s) => s.name).join(" → ") };
      }),
    };
    setTrip(next);
    onTripBuilt?.(next);
    computeLegs(next).catch(() => {});
  };

  const downloadPdf = () => {
    if (!trip) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(trip.title, 14, 20);
    doc.setFontSize(10);
    let y = 30;
    const lines = doc.splitTextToSize(trip.summary || "", 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
    trip.days.forEach((d) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(`Day ${d.day}: ${d.title}`, 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(d.notes || d.stops.map((s) => s.name).join(" → "), 14, y);
      y += 6;
      (legsByDay[d.day] || []).forEach((leg) => {
        doc.text(`  ${leg.from} → ${leg.to}: ${leg.km}km · drive ${leg.driveMin}m`, 14, y);
        y += 5;
      });
      y += 4;
    });
    doc.save(`${trip.id}.pdf`);
  };

  const emailShare = () => {
    if (!trip) return;
    const body = encodeURIComponent(
      `${trip.title}\n\n${trip.summary}\n\n${trip.days
        .map((d) => `Day ${d.day}: ${d.notes || d.stops.map((s) => s.name).join(", ")}`)
        .join("\n")}${shareUrl ? `\n\nLink: ${shareUrl}` : ""}`,
    );
    window.location.href = `mailto:?subject=${encodeURIComponent(trip.title)}&body=${body}`;
  };

  const shareLink = async () => {
    if (!trip) return;
    const res = await fetch("/api/share/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trip.title,
        summary: trip.summary,
        days: trip.days.map((d) => ({
          day: d.day,
          title: d.title,
          notes: d.notes,
          locationIds: d.stops?.map((s) => s.id),
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const url = `${window.location.origin}/trip/${data.data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const startCollab = async () => {
    if (!trip) return;
    const res = await fetch("/api/engagement/collab/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trip.title,
        member: "host",
        days: trip.days.map((d) => ({
          day: d.day,
          title: d.title,
          locationIds: (d.stops || []).map((s) => s.id),
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const url = `${window.location.origin}/collab/${data.data.id}`;
      setCollabUrl(url);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("travelguide_compare_trips");
    if (!saved) localStorage.setItem("travelguide_compare_trips", "[]");
  }, []);

  const saveForCompare = () => {
    if (!trip) return;
    const raw = localStorage.getItem("travelguide_compare_trips");
    const list = raw ? (JSON.parse(raw) as ItineraryTrip[]) : [];
    const next = [trip, ...list.filter((t) => t.id !== trip.id)].slice(0, 5);
    localStorage.setItem("travelguide_compare_trips", JSON.stringify(next));
    alert("Saved to trip compare (Account → Compare trips)");
  };

  const googleCalendar = () => {
    if (!trip) return;
    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + (trip.days.length || 1));
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const details = encodeURIComponent(
      `${trip.summary}\n\n${trip.days.map((d) => `Day ${d.day}: ${d.notes || ""}`).join("\n")}`,
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(trip.title)}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold">Itinerary builder & trip planner</p>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-8 text-xs" placeholder="e.g. 3 days: falls + safari" />
      <div className="flex gap-2">
        <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={2} max={7} className="h-8 w-16 text-xs" />
        <Button size="sm" className="h-8 text-xs flex-1" onClick={build} disabled={loading}>
          {loading ? "Building…" : "Build plan"}
        </Button>
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {trip && (
        <div className="space-y-2 text-xs">
          <p className="font-medium">{trip.title}</p>
          <p className="text-muted-foreground line-clamp-3">{trip.summary}</p>
          {trip.days.map((d) => (
            <div key={d.day} className="border rounded-md p-2 space-y-1">
              <p className="font-semibold">
                Day {d.day}: {d.title}
              </p>
              <ul className="space-y-1">
                {(d.stops || []).map((s, idx) => (
                  <li key={`${s.id}-${idx}`}>
                    <div
                      draggable
                      onDragStart={() => setDrag({ day: d.day, index: idx })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (drag && drag.day === d.day) moveStop(d.day, drag.index, idx);
                        setDrag(null);
                      }}
                      className="cursor-grab active:cursor-grabbing rounded border bg-background px-2 py-1 flex justify-between gap-2"
                    >
                      <span>{s.name}</span>
                      <span className="text-muted-foreground text-[9px]">drag</span>
                    </div>
                    {legsByDay[d.day]?.[idx] && (
                      <p className="text-[9px] text-muted-foreground pl-2">
                        → {legsByDay[d.day][idx].km} km · ~{legsByDay[d.day][idx].driveMin} min drive
                        {legsByDay[d.day][idx].walkMin ? ` / ${legsByDay[d.day][idx].walkMin} min walk` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={downloadPdf}>
              PDF
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={emailShare}>
              Email
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={googleCalendar}>
              Google Calendar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={shareLink}>
              Public link
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={startCollab}>
              Invite friends
            </Button>
            <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={saveForCompare}>
              Save to compare
            </Button>
          </div>
          {shareUrl && (
            <a href={shareUrl} className="text-[10px] text-primary break-all hover:underline" target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          )}
          {collabUrl && (
            <a href={collabUrl} className="text-[10px] text-primary break-all hover:underline block" target="_blank" rel="noreferrer">
              Collab: {collabUrl}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
