import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { getSessionId } from "@/lib/session";
import type { MapLocation } from "@/components/ChatMap";

const INTERESTS = [
  { id: "beach", label: "Beach" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "adventure", label: "Adventure" },
  { id: "luxury", label: "Luxury" },
  { id: "diving", label: "Diving / snorkel" },
];

interface WizardPanelProps {
  onTripBuilt: (stops: MapLocation[], summary: string) => void;
  /** Parent callback so Accept/Adjust always show feedback even if panel remounts */
  onDecision?: (accepted: boolean, message: string) => void;
}

export function TripWizardPanel({ onTripBuilt, onDecision }: WizardPanelProps) {
  const [days, setDays] = useState(3);
  const [budgetMax, setBudgetMax] = useState(200);
  const [month, setMonth] = useState("July");
  const [partySize, setPartySize] = useState(2);
  const [interests, setInterests] = useState<string[]>(["beach", "culture"]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"accept" | "adjust" | null>(null);
  const [summary, setSummary] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [decided, setDecided] = useState<"accepted" | "adjust" | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const toggle = (id: string) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)));
  };

  const build = async () => {
    setLoading(true);
    setStatus(null);
    setDecided(null);
    try {
      const res = await fetch("/api/zanzibar/wizard/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          budgetMax,
          month,
          partySize,
          interests,
          sessionId: getSessionId(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Wizard failed");
      setSummary(d.data.summary);
      setTripId(d.data.id);
      const stops = (d.data.days || []).flatMap((day: { stops?: MapLocation[] }) => day.stops || []);
      onTripBuilt(stops, d.data.summary);
      setStatus({ kind: "ok", text: "Plan ready — Accept to save, or Adjust to change interests." });
    } catch (err) {
      setStatus({ kind: "err", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setLoading(false);
    }
  };

  const remember = async (accepted: boolean) => {
    if (saving || decided === "accepted") return;
    setSaving(accepted ? "accept" : "adjust");
    const message = accepted
      ? "Plan accepted and saved to your travel memory. Ask me about this trip in chat anytime."
      : "Got it — change interests or budget above, then tap Build again.";
    try {
      const res = await fetch("/api/zanzibar/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          interests,
          budgetMax,
          days,
          travelStyle: interests.join("+"),
          eventType: accepted ? "itinerary_accepted" : "itinerary_rejected",
          eventSummary: (summary || tripId || "wizard trip").slice(0, 140),
          note: accepted ? "Liked wizard plan" : "Rejected wizard plan — adjust interests",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Save failed (${res.status})`);

      setDecided(accepted ? "accepted" : "adjust");
      setStatus({ kind: "ok", text: message });
      toast.success(accepted ? "Trip plan saved" : "Adjust your preferences", { description: message });
      onDecision?.(accepted, message);

      if (!accepted) {
        setSummary("");
        setTripId(null);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Could not save feedback";
      setStatus({ kind: "err", text });
      toast.error("Could not save plan", { description: text });
      onDecision?.(accepted, `Could not save: ${text}`);
    } finally {
      setSaving(null);
    }
  };

  const showActions = Boolean(summary) && decided !== "accepted";

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" aria-hidden />
        Trip planner wizard
      </p>
      <p className="text-[10px] text-muted-foreground">Days · budget · interests · season → Zanzibar plan</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px]">
          Days
          <Input type="number" min={2} max={7} className="h-8 text-xs mt-0.5" value={days} onChange={(e) => setDays(Number(e.target.value) || 3)} />
        </label>
        <label className="text-[10px]">
          Budget $/night
          <Input
            type="number"
            min={50}
            className="h-8 text-xs mt-0.5"
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value) || 200)}
          />
        </label>
        <label className="text-[10px]">
          Month
          <Input className="h-8 text-xs mt-0.5" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="text-[10px]">
          Party size
          <Input
            type="number"
            min={1}
            className="h-8 text-xs mt-0.5"
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value) || 1)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {INTERESTS.map((i) => (
          <Button
            key={i.id}
            type="button"
            size="sm"
            variant={interests.includes(i.id) ? "default" : "outline"}
            className="h-7 text-[10px]"
            onClick={() => toggle(i.id)}
          >
            {i.label}
          </Button>
        ))}
      </div>
      <Button type="button" size="sm" className="h-8 text-xs w-full" disabled={loading || !interests.length} onClick={() => void build()}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Build my Zanzibar trip
      </Button>

      {status && (
        <div
          role="status"
          className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
            status.kind === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {status.kind === "ok" ? <Check className="w-3 h-3 inline mr-1 align-text-bottom" aria-hidden /> : null}
          {status.text}
        </div>
      )}

      {showActions && (
        <div className="flex gap-1">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1 h-9 rounded-md bg-emerald-600 text-white px-2 text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
            disabled={!!saving}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void remember(true);
            }}
          >
            {saving === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
            Accept plan
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1 h-9 rounded-md border border-input bg-background px-2 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
            disabled={!!saving}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void remember(false);
            }}
          >
            {saving === "adjust" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
            Adjust
          </button>
        </div>
      )}

      {summary && <p className="text-[11px] leading-relaxed text-muted-foreground">{summary}</p>}
    </Card>
  );
}
