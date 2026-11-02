import type { InterestTag, TourismLocation } from "../../shared/catalog";
import { getById, listAttractions, listHotels, recommendAccommodations } from "../knowledge/mockCommission";
import { getBooking, type BookingRecord } from "./store";
import type { AppUser } from "./users";

export interface ProfileBadge {
  id: string;
  label: string;
  earnedAt: string;
}

export interface TravelProfile {
  interests: InterestTag[];
  interestWeights: Partial<Record<InterestTag, number>>;
  budgetMax?: number;
  travelStyle: string;
  badges: ProfileBadge[];
  historySummary: string;
  bookedItemIds: string[];
  bookingCount: number;
  favoriteCount: number;
  lastLearnedAt: string;
}

const BADGE_DEFS: Array<{
  id: string;
  label: string;
  test: (p: TravelProfile, bookings: BookingRecord[]) => boolean;
}> = [
  {
    id: "nature-lover",
    label: "Nature Lover",
    test: (p) => (p.interestWeights.nature || 0) >= 2,
  },
  {
    id: "culture-enthusiast",
    label: "Culture Enthusiast",
    test: (p) => (p.interestWeights.cultural || 0) >= 2,
  },
  {
    id: "adventure-seeker",
    label: "Adventure Seeker",
    test: (p) => (p.interestWeights.adventure || 0) >= 2,
  },
  {
    id: "luxury-stay",
    label: "Luxury Stay",
    test: (p) => (p.interestWeights.luxury || 0) >= 1 || bookingsHaveLuxury(p),
  },
  {
    id: "budget-explorer",
    label: "Budget Explorer",
    test: (p) => (p.interestWeights.budget || 0) >= 1 || (p.budgetMax != null && p.budgetMax <= 150),
  },
  {
    id: "family-traveller",
    label: "Family Traveller",
    test: (p) => (p.interestWeights.family || 0) >= 1,
  },
  {
    id: "repeat-booker",
    label: "Repeat Booker",
    test: (p) => p.bookingCount >= 2,
  },
  {
    id: "first-booking",
    label: "First Booking",
    test: (p) => p.bookingCount >= 1,
  },
];

function bookingsHaveLuxury(p: TravelProfile): boolean {
  return p.bookedItemIds.some((id) => {
    const loc = getById(id);
    return loc?.budgetTier === "luxury" || (loc?.tags || []).includes("luxury");
  });
}

function emptyProfile(): TravelProfile {
  return {
    interests: [],
    interestWeights: {},
    travelStyle: "Curious explorer",
    badges: [],
    historySummary: "No travel history yet — book or favourite places to personalise.",
    bookedItemIds: [],
    bookingCount: 0,
    favoriteCount: 0,
    lastLearnedAt: new Date().toISOString(),
  };
}

function bump(weights: Partial<Record<InterestTag, number>>, tag: InterestTag, n = 1) {
  weights[tag] = (weights[tag] || 0) + n;
}

function deriveStyle(weights: Partial<Record<InterestTag, number>>, budgetMax?: number): string {
  const ranked = (Object.entries(weights) as Array<[InterestTag, number]>).sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[0];
  if (top === "luxury" || (budgetMax != null && budgetMax >= 350)) return "Luxury seeker";
  if (top === "adventure") return "Adventure traveller";
  if (top === "cultural") return "Culture enthusiast";
  if (top === "nature") return "Nature & wildlife explorer";
  if (top === "family") return "Family trip planner";
  if (top === "budget" || (budgetMax != null && budgetMax <= 120)) return "Budget explorer";
  if (top === "dining") return "Foodie traveller";
  return "Curious explorer";
}

export function learnTravelProfile(input: {
  existing?: TravelProfile | null;
  bookingIds?: string[];
  favorites?: Array<{ id: string; tags?: string[] }>;
  explicitInterests?: InterestTag[];
  explicitBudgetMax?: number;
}): TravelProfile {
  const profile = { ...(input.existing || emptyProfile()) };
  const weights: Partial<Record<InterestTag, number>> = { ...(profile.interestWeights || {}) };
  const bookedItemIds: string[] = [];
  const bookings: BookingRecord[] = [];
  let spendSum = 0;
  let spendN = 0;

  for (const id of input.bookingIds || []) {
    const b = getBooking(id);
    if (!b || b.status === "cancelled") continue;
    bookings.push(b);
    bookedItemIds.push(b.itemId);
    const loc = getById(b.itemId);
    for (const t of loc?.tags || []) bump(weights, t, 3);
    if (b.amountUsd > 0) {
      spendSum += b.amountUsd;
      spendN += 1;
    }
  }

  for (const fav of input.favorites || []) {
    const loc = getById(fav.id);
    const tags = (loc?.tags || fav.tags || []) as InterestTag[];
    for (const t of tags) bump(weights, t, 2);
  }

  for (const t of input.explicitInterests || []) bump(weights, t, 4);

  let budgetMax = input.explicitBudgetMax ?? profile.budgetMax;
  if (spendN > 0) {
    const avg = spendSum / spendN;
    // Learn a comfortable ceiling ~20% above average paid
    const learned = Math.round(avg * 1.2);
    budgetMax = budgetMax != null ? Math.round((budgetMax + learned) / 2) : learned;
  }

  const ranked = (Object.entries(weights) as Array<[InterestTag, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  const interests = Array.from(
    new Set([...(input.explicitInterests || []), ...ranked]),
  ).slice(0, 6) as InterestTag[];

  const next: TravelProfile = {
    interests,
    interestWeights: weights,
    budgetMax,
    travelStyle: deriveStyle(weights, budgetMax),
    badges: profile.badges || [],
    historySummary: "",
    bookedItemIds: Array.from(new Set(bookedItemIds)),
    bookingCount: bookings.length,
    favoriteCount: (input.favorites || []).length,
    lastLearnedAt: new Date().toISOString(),
  };

  const names = bookings.map((b) => b.itemName).slice(0, 5);
  next.historySummary = names.length
    ? `Past bookings: ${names.join(", ")}. Style: ${next.travelStyle}. Interests: ${next.interests.join(", ") || "emerging"}.${
        next.budgetMax ? ` Comfortable budget ~$${next.budgetMax}.` : ""
      }`
    : `No bookings yet. Style: ${next.travelStyle}. Interests: ${next.interests.join(", ") || "set preferences to start"}.`;

  const now = new Date().toISOString();
  const earned = new Map(next.badges.map((b) => [b.id, b]));
  for (const def of BADGE_DEFS) {
    if (def.test(next, bookings) && !earned.has(def.id)) {
      earned.set(def.id, { id: def.id, label: def.label, earnedAt: now });
    }
  }
  next.badges = Array.from(earned.values());
  return next;
}

export function personalizedRecommendations(
  profile: TravelProfile,
  limit = 6,
): Array<TourismLocation & { score: number; reason: string }> {
  const booked = new Set(profile.bookedItemIds);
  const prefs = profile.interests;
  const hotels = recommendAccommodations({
    budgetMax: profile.budgetMax,
    prefs,
  }).map((h) => ({
    ...h,
    reason: `Matches your ${profile.travelStyle.toLowerCase()} profile` + (profile.budgetMax ? ` · under ~$${profile.budgetMax}` : ""),
  }));

  const attrs = listAttractions()
    .filter((a) => !booked.has(a.id))
    .map((a) => {
      let score = 40;
      const reasons: string[] = [];
      for (const t of a.tags || []) {
        const w = profile.interestWeights[t] || 0;
        if (w > 0) {
          score += w * 8;
          reasons.push(t);
        }
        if (prefs.includes(t)) score += 12;
      }
      // Collaborative-ish: similar tags to booked places
      for (const id of profile.bookedItemIds) {
        const past = getById(id);
        const overlap = (a.tags || []).filter((t) => (past?.tags || []).includes(t)).length;
        if (overlap) {
          score += overlap * 10;
          reasons.push(`similar to ${past?.name}`);
        }
      }
      return {
        ...a,
        score,
        reason: reasons.length
          ? `Because you like ${Array.from(new Set(reasons)).slice(0, 3).join(", ")}`
          : "Popular with travellers like you",
      };
    })
    .sort((a, b) => b.score - a.score);

  const hotelRows = hotels
    .filter((h) => !booked.has(h.id))
    .slice(0, 3)
    .map((h) => ({ ...h, reason: h.reason }));

  return [...attrs.slice(0, 4), ...hotelRows].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function profileForUser(user: AppUser | null | undefined, fallback?: TravelProfile | null): TravelProfile {
  if (user?.travelProfile) return user.travelProfile;
  return fallback || emptyProfile();
}
