import { randomUUID } from "crypto";
import { BRAND } from "../../shared/catalog";
import { getById, listAttractions, listHotels } from "../knowledge/mockCommission";
import { getInventoryCalendar } from "./liveServices";
import { haversineKm } from "./haversine";
import { getRating } from "./reviews";
import { readState, writeState } from "./database";

const state = new Map<string, unknown>();
const defaults: Record<string, unknown> = {
  "price-alerts": { alerts: [] },
  spending: { entries: [] },
  gamification: { profiles: [] },
  "favorite-shares": { shares: [] },
  "collab-trips": { trips: [] },
}

export async function initializeEngagementStore(): Promise<void> {
  await Promise.all(Object.entries(defaults).map(async ([key, fallback]) => {
    state.set(key, await readState(key, fallback));
  }));
}

function stateKey(file: string): string {
  return file.replace(/\.json$/, "");
}

function load<T>(file: string, fallback: T): T {
  return structuredClone((state.get(stateKey(file)) as T | undefined) ?? fallback);
}

async function save(file: string, data: unknown): Promise<void> {
  const key = stateKey(file);
  state.set(key, structuredClone(data));
  await writeState(key, data);
}

/* ---- Price alerts ---- */
export interface PriceAlert {
  id: string;
  itemId: string;
  itemName: string;
  targetUsd: number;
  email?: string;
  createdAt: string;
  lastPriceUsd: number;
  triggered: boolean;
}

export async function createPriceAlert(itemId: string, targetUsd: number, email?: string): Promise<PriceAlert> {
  const cal = getInventoryCalendar(itemId);
  const last = cal.days.find((d) => d.available)?.priceUsd ?? cal.days[0]?.priceUsd ?? 0;
  const row: PriceAlert = {
    id: `pa_${randomUUID().slice(0, 8)}`,
    itemId,
    itemName: cal.itemName,
    targetUsd,
    email,
    createdAt: new Date().toISOString(),
    lastPriceUsd: last,
    triggered: last <= targetUsd,
  };
  const data = load<{ alerts: PriceAlert[] }>("price-alerts.json", { alerts: [] });
  data.alerts.unshift(row);
  data.alerts = data.alerts.slice(0, 200);
  await save("price-alerts.json", data);
  return row;
}

export function listPriceAlerts() {
  return load<{ alerts: PriceAlert[] }>("price-alerts.json", { alerts: [] }).alerts;
}

export async function checkPriceAlerts(): Promise<PriceAlert[]> {
  const data = load<{ alerts: PriceAlert[] }>("price-alerts.json", { alerts: [] });
  for (const a of data.alerts) {
    const cal = getInventoryCalendar(a.itemId);
    const price = cal.days.find((d) => d.available)?.priceUsd ?? a.lastPriceUsd;
    a.lastPriceUsd = price;
    if (price <= a.targetUsd) a.triggered = true;
  }
  await save("price-alerts.json", data);
  return data.alerts.filter((a) => a.triggered);
}

/* ---- Spending tracker ---- */
export interface SpendEntry {
  id: string;
  date: string;
  category: "lodging" | "food" | "activities" | "transport" | "other";
  amountUsd: number;
  note?: string;
  createdAt: string;
}

export async function addSpend(entry: Omit<SpendEntry, "id" | "createdAt">): Promise<SpendEntry> {
  const row: SpendEntry = { ...entry, id: `sp_${randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString() };
  const data = load<{ entries: SpendEntry[] }>("spending.json", { entries: [] });
  data.entries.unshift(row);
  await save("spending.json", data);
  return row;
}

export function listSpend() {
  return load<{ entries: SpendEntry[] }>("spending.json", { entries: [] }).entries;
}

export function spendSummary() {
  const entries = listSpend();
  const byCat: Record<string, number> = {};
  let total = 0;
  for (const e of entries) {
    byCat[e.category] = (byCat[e.category] || 0) + e.amountUsd;
    total += e.amountUsd;
  }
  const byDay: Record<string, number> = {};
  for (const e of entries) byDay[e.date] = (byDay[e.date] || 0) + e.amountUsd;
  return { total, byCategory: byCat, byDay, count: entries.length };
}

/* ---- Gamification ---- */
export interface TravelerProfile {
  userKey: string;
  points: number;
  badges: string[];
  reviewsWritten: number;
  bookingsCount: number;
  attractionsVisited: number;
}

const BADGE_RULES: Array<{ id: string; label: string; test: (p: TravelerProfile) => boolean }> = [
  { id: "explorer", label: "Explorer", test: (p) => p.attractionsVisited >= 1 },
  { id: "culture", label: "Culture Enthusiast", test: (p) => p.points >= 50 },
  { id: "reviewer", label: "Helpful Reviewer", test: (p) => p.reviewsWritten >= 2 },
  { id: "booker", label: "Seasoned Booker", test: (p) => p.bookingsCount >= 2 },
  { id: "vip", label: "VIP Traveller", test: (p) => p.points >= 200 },
];

export async function getOrCreateProfile(userKey: string): Promise<TravelerProfile> {
  const data = load<{ profiles: TravelerProfile[] }>("gamification.json", { profiles: [] });
  let p = data.profiles.find((x) => x.userKey === userKey);
  if (!p) {
    p = { userKey, points: 0, badges: [], reviewsWritten: 0, bookingsCount: 0, attractionsVisited: 0 };
    data.profiles.push(p);
    await save("gamification.json", data);
  }
  return p;
}

export async function awardPoints(
  userKey: string,
  pts: number,
  reason: "review" | "booking" | "visit" | "recommend",
): Promise<TravelerProfile> {
  const data = load<{ profiles: TravelerProfile[] }>("gamification.json", { profiles: [] });
  let p = data.profiles.find((x) => x.userKey === userKey);
  if (!p) {
    p = { userKey, points: 0, badges: [], reviewsWritten: 0, bookingsCount: 0, attractionsVisited: 0 };
    data.profiles.push(p);
  }
  p.points += pts;
  if (reason === "review") p.reviewsWritten += 1;
  if (reason === "booking") p.bookingsCount += 1;
  if (reason === "visit") p.attractionsVisited += 1;
  for (const b of BADGE_RULES) {
    if (b.test(p) && !p.badges.includes(b.id)) p.badges.push(b.id);
  }
  await save("gamification.json", data);
  return p;
}

export function leaderboard(limit = 10) {
  const data = load<{ profiles: TravelerProfile[] }>("gamification.json", { profiles: [] });
  return [...data.profiles].sort((a, b) => b.points - a.points).slice(0, limit);
}

export async function exclusiveDeal(userKey: string) {
  const p = await getOrCreateProfile(userKey);
  if (p.points < 100) return { unlocked: false, deal: null, need: 100 - p.points };
  return {
    unlocked: true,
    deal: { code: "TG-VIP10", discountPct: 10, note: "10% off demo bookings — milestone reward" },
    need: 0,
  };
}

/* ---- Trending / people also visited ---- */
export function trendingNow() {
  const attrs = listAttractions();
  return attrs
    .map((a) => {
      const r = getRating(a.id);
      const score = r.average * 10 + r.count * 3 + (a.crowdLevel === "busy" ? 8 : 0);
      return { ...a, trendScore: score, ratingAverage: r.average, ratingCount: r.count };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 6);
}

export function peopleAlsoVisited(locationId: string) {
  const seed = getById(locationId);
  if (!seed) return [];
  const pool = [...listAttractions(), ...listHotels()].filter((l) => l.id !== locationId);
  return pool
    .map((l) => ({
      ...l,
      score:
        (l.tags || []).filter((t) => (seed.tags || []).includes(t)).length * 20 +
        Math.max(0, 30 - haversineKm(seed.lat, seed.lng, l.lat, l.lng) / 20) +
        getRating(l.id).average * 5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/* ---- Price compare ---- */
export function comparePrices(ids: string[], date?: string) {
  return ids.map((id) => {
    const loc = getById(id);
    const cal = getInventoryCalendar(id, date, 7);
    const day = cal.days[0];
    const peers = (loc?.type === "hotel" ? listHotels() : listAttractions())
      .filter((p) => p.id !== id)
      .slice(0, 3)
      .map((p) => {
        const c = getInventoryCalendar(p.id, date, 1).days[0];
        return { id: p.id, name: p.name, priceUsd: c?.priceUsd, available: c?.available };
      });
    return {
      id,
      name: cal.itemName,
      type: loc?.type,
      date: day?.date,
      priceUsd: day?.priceUsd,
      available: day?.available,
      remaining: day?.remaining,
      isBestPrice: false,
      peers,
      platforms: [
        { name: "Zanzibar Guide", priceUsd: day?.priceUsd },
        { name: "Partner A (mock)", priceUsd: day ? Math.round(day.priceUsd * 1.08) : null },
        { name: "Partner B (mock)", priceUsd: day ? Math.round(day.priceUsd * 0.97) : null },
      ],
    };
  }).map((row, _, arr) => {
    const hotelPrices = arr.filter((x) => x.type === "hotel" && x.priceUsd != null).map((x) => x.priceUsd as number);
    const best = hotelPrices.length ? Math.min(...hotelPrices) : null;
    return { ...row, isBestPrice: best != null && row.priceUsd === best };
  });
}

/* ---- Favorites share ---- */
export async function shareFavorites(items: Array<{ id: string; name: string }>, title?: string) {
  const id = `fav_${randomUUID().slice(0, 8)}`;
  const data = load<{ shares: Array<{ id: string; title: string; items: typeof items; createdAt: string }> }>(
    "favorite-shares.json",
    { shares: [] },
  );
  const row = { id, title: title || "My Zanzibar Guide favorites", items, createdAt: new Date().toISOString() };
  data.shares.unshift(row);
  await save("favorite-shares.json", data);
  return row;
}

export function getFavoriteShare(id: string) {
  return load<{ shares: Array<{ id: string; title: string; items: Array<{ id: string; name: string }>; createdAt: string }> }>(
    "favorite-shares.json",
    { shares: [] },
  ).shares.find((s) => s.id === id);
}

/* ---- Collaborative trips ---- */
export interface CollabTrip {
  id: string;
  title: string;
  inviteCode: string;
  editable: boolean;
  days: Array<{ day: number; title: string; locationIds: string[] }>;
  members: string[];
  createdAt: string;
}

export async function createCollabTrip(title: string, days: CollabTrip["days"], member = "host"): Promise<CollabTrip> {
  const row: CollabTrip = {
    id: `collab_${randomUUID().slice(0, 8)}`,
    title,
    inviteCode: randomUUID().slice(0, 6).toUpperCase(),
    editable: true,
    days,
    members: [member],
    createdAt: new Date().toISOString(),
  };
  const data = load<{ trips: CollabTrip[] }>("collab-trips.json", { trips: [] });
  data.trips.unshift(row);
  await save("collab-trips.json", data);
  return row;
}

export function getCollabTrip(idOrCode: string) {
  const data = load<{ trips: CollabTrip[] }>("collab-trips.json", { trips: [] });
  return data.trips.find((t) => t.id === idOrCode || t.inviteCode === idOrCode);
}

export async function updateCollabTrip(id: string, patch: Partial<CollabTrip>, member?: string) {
  const data = load<{ trips: CollabTrip[] }>("collab-trips.json", { trips: [] });
  const idx = data.trips.findIndex((t) => t.id === id);
  if (idx < 0) return undefined;
  const cur = data.trips[idx];
  if (member && !cur.members.includes(member)) cur.members.push(member);
  data.trips[idx] = { ...cur, ...patch, id: cur.id, inviteCode: cur.inviteCode };
  await save("collab-trips.json", data);
  return data.trips[idx];
}

export function cityCenterDistanceKm(lat: number, lng: number) {
  return haversineKm(BRAND.defaultCenter.lat, BRAND.defaultCenter.lng, lat, lng);
}

export function travelLeg(a: { lat: number; lng: number; name: string }, b: { lat: number; lng: number; name: string }) {
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const driveMin = Math.max(5, Math.round((km / 40) * 60));
  const walkMin = Math.round((km / 5) * 60);
  return {
    from: a.name,
    to: b.name,
    km: Math.round(km * 10) / 10,
    driveMin,
    walkMin: walkMin > 180 ? null : walkMin,
    parkingNote: "Street / hotel parking ~$2–5 (demo)",
    rideShare: "Ride-hail typically available in town centers (demo)",
  };
}
