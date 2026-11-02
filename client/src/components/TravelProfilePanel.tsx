import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSessionId } from "@/lib/session";
import type { MapLocation } from "@/components/ChatMap";

interface ProfileBadge {
  id: string;
  label: string;
  earnedAt: string;
}

interface TravelProfile {
  interests: string[];
  budgetMax?: number;
  travelStyle: string;
  badges: ProfileBadge[];
  historySummary: string;
  bookingCount: number;
  favoriteCount: number;
  lastLearnedAt: string;
}

interface Rec extends MapLocation {
  score?: number;
  reason?: string;
}

interface TravelProfilePanelProps {
  onSelect?: (loc: MapLocation) => void;
}

export function TravelProfilePanel({ onSelect }: TravelProfilePanelProps) {
  const [profile, setProfile] = useState<TravelProfile | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = () => {
    const t = localStorage.getItem("travelguide_token");
    return {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  };

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/profile/me?sessionId=${encodeURIComponent(getSessionId())}`, {
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setProfile(data.data.profile);
      setRecs(data.data.recommendations || []);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const relearn = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/learn", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setProfile(data.data.profile);
      setRecs(data.data.recommendations || []);
      setStatus("Profile re-learned from bookings & favourites");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold">Travel profile & personalization</p>
      {loading && !profile && <p className="text-[10px] text-muted-foreground">Loading…</p>}
      {profile && (
        <>
          <p className="text-[10px]">
            <span className="font-medium">{profile.travelStyle}</span>
            {profile.budgetMax != null ? ` · budget ~$${profile.budgetMax}` : ""}
            {" · "}
            {profile.bookingCount} booking{profile.bookingCount === 1 ? "" : "s"}
            {" · "}
            {profile.favoriteCount} favourite{profile.favoriteCount === 1 ? "" : "s"}
          </p>
          <p className="text-[10px] text-muted-foreground">{profile.historySummary}</p>
          <div className="flex flex-wrap gap-1">
            {profile.interests.map((i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md border bg-muted">
                {i}
              </span>
            ))}
          </div>
          <p className="text-[10px] font-medium">Profile badges</p>
          <div className="flex flex-wrap gap-1">
            {profile.badges.length ? (
              profile.badges.map((b) => (
                <span
                  key={b.id}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900"
                  title={`Earned ${b.earnedAt.slice(0, 10)}`}
                >
                  {b.label}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground">Book or favourite places to earn badges</span>
            )}
          </div>
          <p className="text-[10px] font-medium pt-1">Recommended for you</p>
          <ul className="text-[10px] space-y-1 max-h-36 overflow-y-auto">
            {recs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="text-left w-full rounded border px-2 py-1 hover:bg-accent"
                  onClick={() => onSelect?.(r)}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground block">{r.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-[10px] flex-1" onClick={relearn} disabled={loading}>
          Re-learn from history
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
      <p className="text-[9px] text-muted-foreground">
        Learning loop: bookings + favourites + saved prefs → interests, budget, badges → chat & recommendations.
        Log in on Account to persist across sessions.
      </p>
    </Card>
  );
}
