import {
  CATALOG_LOCATIONS,
  FAQ_ARTICLES,
  SAFETY_ADVISORIES,
  TOURISM_EVENTS,
  type InterestTag,
  type TourismLocation,
} from "../../shared/catalog";
import { readCms } from "../lib/cmsStore";
import { haversineKm } from "../lib/haversine";

function locations(): TourismLocation[] {
  try {
    return readCms().attractions;
  } catch {
    return CATALOG_LOCATIONS;
  }
}

export function listAttractions(tag?: string): TourismLocation[] {
  return locations().filter((l) => {
    if (l.type !== "attraction") return false;
    if (!tag) return true;
    return (l.tags ?? []).includes(tag as InterestTag);
  });
}

export function getById(id: string): TourismLocation | undefined {
  return locations().find((l) => l.id === id);
}

export function listHotels(): TourismLocation[] {
  return locations().filter((l) => l.type === "hotel");
}

export function recommendAccommodations(opts: {
  budgetMax?: number;
  lat?: number;
  lng?: number;
  prefs?: InterestTag[];
}): Array<TourismLocation & { score: number; distanceKm?: number }> {
  const prefs = opts.prefs ?? [];
  return listHotels()
    .map((h) => {
      let score = 50;
      const price = h.pricePerNight ?? 9999;
      if (opts.budgetMax != null) {
        if (price <= opts.budgetMax) score += 30;
        else score -= Math.min(40, (price - opts.budgetMax) / 10);
      }
      for (const p of prefs) {
        if (h.tags?.includes(p)) score += 15;
      }
      let distanceKm: number | undefined;
      if (opts.lat != null && opts.lng != null) {
        distanceKm = haversineKm(opts.lat, opts.lng, h.lat, h.lng);
        score += Math.max(0, 20 - distanceKm / 10);
      }
      return { ...h, score, distanceKm };
    })
    .sort((a, b) => b.score - a.score);
}

export function listEvents() {
  return TOURISM_EVENTS.map((e) => ({
    ...e,
    location: getById(e.locationId) ?? null,
  }));
}

export function listSafety() {
  try {
    return readCms().alerts;
  } catch {
    return SAFETY_ADVISORIES;
  }
}

export function listAlerts() {
  return listSafety().filter((a) => a.severity === "watch" || a.severity === "alert");
}

export function searchFaq(q?: string) {
  let faqs = FAQ_ARTICLES;
  try {
    faqs = readCms().faqs;
  } catch {
    /* seed */
  }
  if (!q?.trim()) return faqs;
  const needle = q.toLowerCase();
  return faqs.filter(
    (f) =>
      f.title.toLowerCase().includes(needle) ||
      f.summary.toLowerCase().includes(needle) ||
      f.body.toLowerCase().includes(needle) ||
      f.keywords.some((k) => k.includes(needle)) ||
      f.category.includes(needle),
  );
}

export function getFaq(id: string) {
  return searchFaq().find((f) => f.id === id);
}

export function nearbyEmergency(lat: number, lng: number, limit = 5) {
  return locations()
    .filter((l) => l.type === "emergency")
    .map((l) => ({
      ...l,
      distanceKm: Math.round(haversineKm(lat, lng, l.lat, l.lng) * 10) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function retrievalBundle(query: string) {
  const q = query.toLowerCase();
  const attractions = listAttractions().filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags ?? []).some((t) => q.includes(t)),
  );
  const hotels = recommendAccommodations({}).slice(0, 4);
  const faqs = searchFaq(query).slice(0, 3);
  const alerts = listAlerts();
  const events = listEvents().filter(
    (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
  );
  return { attractions: attractions.slice(0, 5), hotels, faqs, alerts, events: events.slice(0, 3) };
}
