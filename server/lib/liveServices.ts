import { getById, listAttractions, listAlerts } from "../knowledge/mockCommission";
import type { CitationSource } from "../../shared/sources";

export interface InventoryDay {
  date: string;
  available: boolean;
  remaining: number;
  priceUsd: number;
  priceLabel: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getInventoryCalendar(itemId: string, from?: string, days = 14): {
  itemId: string;
  itemName: string;
  currency: string;
  days: InventoryDay[];
  sources: CitationSource[];
} {
  const loc = getById(itemId) || listAttractions().find((a) => a.id === itemId);
  const name = loc?.name || itemId;
  const base =
    loc?.pricePerNight ??
    loc?.entryFee ??
    (loc?.type === "hotel" ? 180 : 45);
  const start = from || new Date().toISOString().slice(0, 10);
  const out: InventoryDay[] = [];
  for (let i = 0; i < Math.min(31, Math.max(7, days)); i++) {
    const date = addDays(start, i);
    const h = hash(`${itemId}:${date}`);
    const available = h % 7 !== 0; // ~1 day/week sold out
    const remaining = available ? 2 + (h % 12) : 0;
    const surge = 1 + ((h % 5) - 2) * 0.05;
    const priceUsd = Math.round(base * surge);
    out.push({
      date,
      available,
      remaining,
      priceUsd,
      priceLabel: `$${priceUsd}${loc?.type === "hotel" ? "/night" : ""}`,
    });
  }
  return {
    itemId,
    itemName: name,
    currency: "USD",
    days: out,
    sources: [
      {
        id: `inv_${itemId}`,
        kind: "inventory",
        title: `Live availability · ${name}`,
        detail: "Mock partner inventory feed (demo)",
      },
    ],
  };
}

export async function fetchWeather(lat: number, lng: number): Promise<{
  tempC: number;
  windKph: number;
  code: number;
  summary: string;
  sources: CitationSource[];
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
  };
  const code = data.current?.weather_code ?? 0;
  const summary =
    code === 0
      ? "Clear"
      : code < 4
        ? "Partly cloudy"
        : code < 50
          ? "Foggy / hazy"
          : code < 70
            ? "Rain likely"
            : "Stormy / unsettled";
  return {
    tempC: Math.round(data.current?.temperature_2m ?? 24),
    windKph: Math.round(data.current?.wind_speed_10m ?? 8),
    code,
    summary,
    sources: [
      {
        id: "weather_open_meteo",
        kind: "weather",
        title: "Open-Meteo weather",
        detail: `${summary}, ${data.current?.temperature_2m}°C`,
        url: "https://open-meteo.com/",
      },
    ],
  };
}

export async function fetchFx(base = "USD", symbols = "EUR,GBP,ZAR"): Promise<{
  base: string;
  rates: Record<string, number>;
  sources: CitationSource[];
}> {
  const url = `https://open.er-api.com/v6/latest/${base}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number>; result?: string };
  const wanted = symbols.split(",").map((s) => s.trim().toUpperCase());
  const rates: Record<string, number> = {};
  for (const s of wanted) {
    if (data.rates?.[s] != null) rates[s] = Number(data.rates[s].toFixed(4));
  }
  return {
    base,
    rates,
    sources: [
      {
        id: "fx_open_er",
        kind: "fx",
        title: "Open Exchange Rates (er-api)",
        detail: `${base} → ${Object.keys(rates).join(", ")}`,
        url: "https://www.exchangerate-api.com/",
      },
    ],
  };
}

export function buildCompanionNudges(opts?: {
  lat?: number;
  lng?: number;
  locationIds?: string[];
}): Promise<{
  nudges: Array<{
    id: string;
    priority: "info" | "watch" | "urgent";
    title: string;
    body: string;
    when: string;
  }>;
  sources: CitationSource[];
}> {
  return (async () => {
    const lat = opts?.lat ?? -17.9243;
    const lng = opts?.lng ?? 25.8572;
    const sources: CitationSource[] = [];
    const nudges: Array<{
      id: string;
      priority: "info" | "watch" | "urgent";
      title: string;
      body: string;
      when: string;
    }> = [];

    try {
      const weather = await fetchWeather(lat, lng);
      sources.push(...weather.sources);
      nudges.push({
        id: "nudge_weather",
        priority: weather.code >= 60 ? "watch" : "info",
        title: `Weather near you: ${weather.summary}`,
        body: `${weather.tempC}°C · wind ${weather.windKph} km/h. Pack accordingly for outdoor plans.`,
        when: "now",
      });
    } catch {
      nudges.push({
        id: "nudge_weather_offline",
        priority: "info",
        title: "Weather feed offline",
        body: "Live weather unavailable — check again shortly.",
        when: "now",
      });
    }

    const alerts = listAlerts();
    for (const a of alerts.slice(0, 2)) {
      sources.push({
        id: a.id,
        kind: "alert",
        title: a.title,
        detail: a.summary,
        url: a.sourceUrl,
      });
      nudges.push({
        id: `nudge_${a.id}`,
        priority: a.severity === "alert" ? "urgent" : "watch",
        title: `Safety update: ${a.title}`,
        body: a.summary,
        when: a.updatedAt,
      });
    }

    const ids = opts?.locationIds?.length
      ? opts.locationIds
      : ["stone-town", "nungwi", "jozani"];
    for (const id of ids.slice(0, 3)) {
      const loc = getById(id);
      if (!loc?.hours) continue;
      const openMatch = loc.hours.match(/(\d{1,2}:\d{2})/);
      const open = openMatch?.[1] || "06:00";
      nudges.push({
        id: `nudge_gate_${id}`,
        priority: "info",
        title: `Tomorrow: ${loc.name} opens ${open}`,
        body: `Hours: ${loc.hours}. ${loc.price ? `Typical fee ${loc.price}.` : ""} Arrive early for parking and tickets.`,
        when: "tomorrow",
      });
      sources.push({
        id: `cms_${id}`,
        kind: "cms",
        title: loc.name,
        detail: loc.hours,
      });
    }

    return { nudges, sources };
  })();
}
