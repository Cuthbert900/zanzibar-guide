import { BRAND, CATALOG_LOCATIONS } from "../../shared/catalog";

export type SuitabilityLabel = "optimal" | "good" | "moderate" | "indoor";

export interface DaySuitability {
  date: string;
  dayLabel: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  windMaxKph: number;
  weatherCode: number;
  score: number;
  label: SuitabilityLabel;
  tip: string;
}

export interface SuitabilityResult {
  locationId: string;
  locationName: string;
  lat: number;
  lng: number;
  activityHint: string;
  days: DaySuitability[];
  source: string;
}

function activityHint(locationId: string, tags: string[]): string {
  if (locationId === "paje") return "kitesurf / east-coast beach";
  if (locationId === "nungwi" || locationId === "kendwa") return "swimming & beach time";
  if (locationId === "prison-island" || locationId === "mnemba") return "boat & snorkel trip";
  if (locationId === "spice-tour") return "outdoor farm walk";
  if (locationId === "jozani") return "forest walk";
  if (locationId === "stone-town") return "city walking & culture";
  if (tags.includes("adventure")) return "outdoor adventure";
  if (tags.includes("nature")) return "outdoor sightseeing";
  return "general outdoor visit";
}

/** Score inspired by Sri Lanka tourism suitability (temp / rain / wind). */
export function scoreWeather(temp: number, rain: number, wind: number): number {
  let s = 0;
  if (temp >= 24 && temp <= 31) s += 40;
  else if (temp >= 22 && temp < 24) s += 32;
  else if (temp > 31 && temp <= 34) s += 28;
  else s += 15;

  if (rain === 0) s += 35;
  else if (rain < 3) s += 30;
  else if (rain < 10) s += 22;
  else if (rain < 25) s += 12;
  else s += 5;

  if (wind < 15) s += 25;
  else if (wind < 25) s += 20;
  else if (wind < 35) s += 12;
  else s += 5;

  return Math.min(100, s);
}

export function labelFromScore(score: number): SuitabilityLabel {
  if (score >= 75) return "optimal";
  if (score >= 60) return "good";
  if (score >= 45) return "moderate";
  return "indoor";
}

export function tipFor(label: SuitabilityLabel, activity: string): string {
  switch (label) {
    case "optimal":
      return `Ideal conditions for ${activity}.`;
    case "good":
      return `Good for ${activity} — pack sunscreen and water.`;
    case "moderate":
      return `Fair for ${activity}; carry a light rain layer.`;
    default:
      return `Better for indoor/Stone Town museums or spa time than exposed ${activity}.`;
  }
}

export async function fetchSuitability(opts?: {
  locationId?: string;
  lat?: number;
  lng?: number;
  days?: number;
}): Promise<SuitabilityResult> {
  const loc =
    CATALOG_LOCATIONS.find((l) => l.id === opts?.locationId) ||
    CATALOG_LOCATIONS.find((l) => l.id === "stone-town") ||
    CATALOG_LOCATIONS[0];

  const lat = opts?.lat ?? loc.lat ?? BRAND.defaultCenter.lat;
  const lng = opts?.lng ?? loc.lng ?? BRAND.defaultCenter.lng;
  const dayCount = Math.min(7, Math.max(3, opts?.days || 5));
  const activity = activityHint(loc.id, loc.tags || []);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&forecast_days=${dayCount}&timezone=Africa%2FDar_es_Salaam`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_sum?: number[];
      wind_speed_10m_max?: number[];
    };
  };

  const times = data.daily?.time || [];
  const days: DaySuitability[] = times.map((date, i) => {
    const tempMax = data.daily?.temperature_2m_max?.[i] ?? 29;
    const tempMin = data.daily?.temperature_2m_min?.[i] ?? 24;
    const precip = data.daily?.precipitation_sum?.[i] ?? 0;
    const wind = data.daily?.wind_speed_10m_max?.[i] ?? 15;
    const code = data.daily?.weather_code?.[i] ?? 0;
    const score = scoreWeather(tempMax, precip, wind);
    const label = labelFromScore(score);
    const d = new Date(date + "T12:00:00");
    return {
      date,
      dayLabel: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      tempMaxC: Math.round(tempMax),
      tempMinC: Math.round(tempMin),
      precipMm: Math.round(precip * 10) / 10,
      windMaxKph: Math.round(wind),
      weatherCode: code,
      score,
      label,
      tip: tipFor(label, activity),
    };
  });

  return {
    locationId: loc.id,
    locationName: loc.name,
    lat,
    lng,
    activityHint: activity,
    days,
    source: "Open-Meteo + Zanzibar Guide suitability score",
  };
}
