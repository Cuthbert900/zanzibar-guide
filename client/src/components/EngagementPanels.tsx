import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bell, GitCompare, TrendingUp, Trophy } from "lucide-react";
import { getSessionId } from "@/lib/session";
import type { MapLocation } from "@/components/ChatMap";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function TrendingPanel({ onSelect }: { onSelect?: (loc: MapLocation) => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Array<MapLocation & { trendScore?: number; ratingAverage?: number }>>([]);
  useEffect(() => {
    fetch("/api/engagement/trending")
      .then((r) => r.json())
      .then((d) => setRows(d.data || []))
      .catch(() => {});
  }, []);
  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <TrendingUp className="w-3.5 h-3.5" /> {t("trendingNow")}
      </p>
      <ul className="text-[10px] space-y-1 max-h-32 overflow-y-auto">
        {rows.map((r, i) => (
          <li key={r.id}>
            <button type="button" className="text-left hover:underline" onClick={() => onSelect?.(r)}>
              {i + 1}. {r.name}
              {r.ratingAverage ? ` · ★ ${r.ratingAverage}` : ""}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PriceAlertPanel({ itemId, itemName }: { itemId?: string; itemName?: string }) {
  const { formatMoney, currency, convertToUsd } = useCurrency();
  const { t } = useLanguage();
  const [target, setTarget] = useState("100");
  const [status, setStatus] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Array<{ id: string; itemName: string; targetUsd: number; lastPriceUsd: number; triggered: boolean }>>([]);

  const refresh = async () => {
    const res = await fetch("/api/engagement/price-alerts");
    const data = await res.json();
    setAlerts(data.data || []);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const create = async () => {
    if (!itemId) {
      setStatus("Select a hotel/attraction first");
      return;
    }
    const targetUsd = Math.round(convertToUsd(Number(target) || 0));
    const res = await fetch("/api/engagement/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, targetUsd }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error);
      return;
    }
    setStatus(
      data.data.triggered
        ? "Already at/below target — alert armed"
        : `Watching ${itemName} ≤ ${formatMoney(targetUsd)}`,
    );
    await refresh();
  };

  const check = async () => {
    const res = await fetch("/api/engagement/price-alerts/check", { method: "POST" });
    const data = await res.json();
    setStatus(`${(data.data || []).length} triggered · logged to notifications`);
    await refresh();
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Bell className="w-3.5 h-3.5" /> {t("priceAlerts")}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {itemName ? t("watching", { name: itemName }) : t("selectPlaceFirst")}
      </p>
      <div className="flex gap-2">
        <Input
          className="h-8 text-xs"
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-label={`Target ${currency}`}
          placeholder={t("maxBudget", { currency })}
        />
        <Button size="sm" className="h-8 text-xs" onClick={create}>
          {t("alertMe")}
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={check}>
        {t("checkPriceDrops")}
      </Button>
      {status && <p className="text-[10px]">{status}</p>}
      <ul className="text-[10px] max-h-24 overflow-y-auto space-y-1">
        {alerts.map((a) => (
          <li key={a.id}>
            {a.itemName}: target {formatMoney(a.targetUsd)} · now {formatMoney(a.lastPriceUsd)}{" "}
            {a.triggered ? "· TRIGGERED" : ""}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ComparePanel({ candidates }: { candidates: MapLocation[] }) {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)));
  };

  const run = async () => {
    const ids = selected.length ? selected : candidates.slice(0, 3).map((c) => c.id);
    const res = await fetch("/api/engagement/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    setRows(data.data || []);
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <GitCompare className="w-3.5 h-3.5" /> {t("compareTools")}
      </p>
      <div className="flex flex-wrap gap-1">
        {candidates.slice(0, 8).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`text-[10px] px-2 py-0.5 rounded border ${selected.includes(c.id) ? "bg-primary text-primary-foreground" : ""}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <Button size="sm" className="h-8 text-xs w-full" onClick={run}>
        {t("comparePrices")}
      </Button>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1">{t("place")}</th>
              <th>{t("price")}</th>
              <th>{t("bestPrice")}</th>
              <th>{t("platforms")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-b border-border/40">
                <td className="py-1 pr-2">{String(r.name)}</td>
                <td>{r.priceUsd != null ? formatMoney(Number(r.priceUsd)) : "—"}</td>
                <td>{r.isBestPrice ? t("yes") : "—"}</td>
                <td>
                  {Array.isArray(r.platforms)
                    ? (r.platforms as Array<{ name: string; priceUsd: number }>)
                        .map((p) => `${p.name}:${formatMoney(p.priceUsd)}`)
                        .join(" · ")
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function GamificationPanel() {
  const key = getSessionId();
  const [profile, setProfile] = useState<{ points: number; badges: string[]; reviewsWritten: number } | null>(null);
  const [deal, setDeal] = useState<{ unlocked: boolean; deal: { code: string; discountPct: number } | null; need: number } | null>(null);
  const [board, setBoard] = useState<Array<{ userKey: string; points: number }>>([]);
  const labels: Record<string, string> = {
    explorer: "Explorer",
    culture: "Culture Enthusiast",
    reviewer: "Helpful Reviewer",
    booker: "Seasoned Booker",
    vip: "VIP Traveller",
  };

  const refresh = async () => {
    const [p, l] = await Promise.all([
      fetch(`/api/engagement/gamification/${key}`).then((r) => r.json()),
      fetch("/api/engagement/leaderboard").then((r) => r.json()),
    ]);
    setProfile(p.data);
    setDeal(p.deal);
    setBoard(l.data || []);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const visit = async () => {
    await fetch(`/api/engagement/gamification/${key}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "visit", points: 10 }),
    });
    await refresh();
  };

  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1">
        <Trophy className="w-3.5 h-3.5" /> Gamification
      </p>
      {profile && (
        <p className="text-[10px]">
          {profile.points} pts · badges: {profile.badges.map((b) => labels[b] || b).join(", ") || "none yet"}
        </p>
      )}
      {deal && (
        <p className="text-[10px] text-muted-foreground">
          {deal.unlocked && deal.deal
            ? `Exclusive deal unlocked: ${deal.deal.code} (−${deal.deal.discountPct}%)`
            : `${deal.need} pts to unlock VIP deal`}
        </p>
      )}
      <Button size="sm" className="h-7 text-[10px]" onClick={visit}>
        Log visit (+10)
      </Button>
      <p className="text-[10px] font-medium">Leaderboard</p>
      <ul className="text-[10px] text-muted-foreground max-h-24 overflow-y-auto">
        {board.map((b, i) => (
          <li key={b.userKey}>
            {i + 1}. {b.userKey.slice(0, 10)}… — {b.points} pts
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AlsoVisitedPanel({ locationId, onSelect }: { locationId?: string; onSelect?: (loc: MapLocation) => void }) {
  const [rows, setRows] = useState<MapLocation[]>([]);
  useEffect(() => {
    if (!locationId) return;
    fetch(`/api/engagement/also-visited/${locationId}`)
      .then((r) => r.json())
      .then((d) => setRows(d.data || []))
      .catch(() => {});
  }, [locationId]);
  if (!locationId) return null;
  return (
    <Card className="p-3 border-border/50 space-y-2">
      <p className="text-xs font-semibold">People like you also visited</p>
      <ul className="text-[10px] space-y-1">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" className="hover:underline text-left" onClick={() => onSelect?.(r)}>
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TransportInfoPanel({ location }: { location?: MapLocation & { transitNotes?: string; parkingUsd?: number | null; rideShareAvailable?: boolean } }) {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  if (!location) {
    return (
      <Card className="p-3 border-border/50">
        <p className="text-xs font-semibold">{t("transportLogistics")}</p>
        <p className="text-[10px] text-muted-foreground">{t("selectPlaceTransport")}</p>
      </Card>
    );
  }
  const loc = location as typeof location & {
    transitNotes?: string;
    parkingUsd?: number | null;
    rideShareAvailable?: boolean;
    transport?: string[];
  };
  return (
    <Card className="p-3 border-border/50 space-y-1">
      <p className="text-xs font-semibold">{t("transportLogistics")}</p>
      <p className="text-[10px]">{loc.transitNotes || (loc.transport || []).join(" · ") || "Local taxi / minibus"}</p>
      <p className="text-[10px] text-muted-foreground">
        {t("parking")}: {loc.parkingUsd != null ? `~${formatMoney(loc.parkingUsd)}` : "n/a"} · {t("rideShare")}:{" "}
        {loc.rideShareAvailable === false ? t("limited") : t("available")}
      </p>
    </Card>
  );
}
