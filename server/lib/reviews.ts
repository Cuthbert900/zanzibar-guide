import { randomUUID } from "crypto";
import { readState, writeState } from "./database";

export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface Review {
  id: string;
  locationId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  sentiment: ReviewSentiment;
  helpfulVotes: number;
}

export interface RatingSummary {
  locationId: string;
  count: number;
  average: number;
  positiveShare: number;
}

const POS = /\b(great|amazing|excellent|love|wonderful|unforgettable|worth|beautiful|friendly|perfect|recommend)\b/i;
const NEG = /\b(bad|poor|terrible|awful|dirty|rude|avoid|disappoint|overpriced|worst|broken)\b/i;

export function detectSentiment(text: string, rating: number): ReviewSentiment {
  if (POS.test(text) && !NEG.test(text)) return "positive";
  if (NEG.test(text) && !POS.test(text)) return "negative";
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "neutral";
}

const SEED: Review[] = [
  {
    id: "rev_seed_1",
    locationId: "stone-town",
    author: "Amara K.",
    rating: 5,
    title: "Magic alleys",
    body: "Hire a guide for House of Wonders and the spice markets. Arrive early — wonderful experience.",
    createdAt: "2026-06-12T10:00:00.000Z",
    sentiment: "positive",
    helpfulVotes: 12,
  },
  {
    id: "rev_seed_2",
    locationId: "nungwi",
    author: "Tom R.",
    rating: 4,
    title: "Perfect sunset beach",
    body: "Swim at high tide. Combine with a dhow sunset. Recommend Kendwa for quieter water.",
    createdAt: "2026-05-02T14:20:00.000Z",
    sentiment: "positive",
    helpfulVotes: 7,
  },
  {
    id: "rev_seed_3",
    locationId: "jozani",
    author: "Lindiwe M.",
    rating: 5,
    title: "Red colobus!",
    body: "Morning visit was excellent. Book a guide for the mangrove walk.",
    createdAt: "2026-04-18T08:00:00.000Z",
    sentiment: "positive",
    helpfulVotes: 9,
  },
  {
    id: "rev_seed_4",
    locationId: "spice-tour",
    author: "Chris P.",
    rating: 5,
    title: "Aromatic and fun",
    body: "Hands-on tasting tour — the stories bring the spices to life. Amazing.",
    createdAt: "2026-03-22T11:30:00.000Z",
    sentiment: "positive",
    helpfulVotes: 15,
  },
  {
    id: "rev_seed_5",
    locationId: "park-hyatt-znz",
    author: "Sofia N.",
    rating: 4,
    title: "Seafront luxury",
    body: "Beautiful pool and location; request a harbour-view room if possible.",
    createdAt: "2026-07-01T16:00:00.000Z",
    sentiment: "positive",
    helpfulVotes: 5,
  },
  {
    id: "rev_seed_6",
    locationId: "nungwi-beach-resort",
    author: "Sam D.",
    rating: 2,
    title: "Busy and pricey",
    body: "Location is fine but rooms felt tired and overpriced for what you get.",
    createdAt: "2026-06-20T09:00:00.000Z",
    sentiment: "negative",
    helpfulVotes: 3,
  },
];

let reviews: Review[] = [];

export async function initializeReviewsStore(): Promise<void> {
  const data = await readState("reviews", { reviews: SEED });
  let changed = false;
  data.reviews = (data.reviews || []).map((r) => {
    const next = { ...r };
    if (!next.sentiment) {
      next.sentiment = detectSentiment(`${next.title} ${next.body}`, next.rating);
      changed = true;
    }
    if (next.helpfulVotes == null) {
      next.helpfulVotes = 0;
      changed = true;
    }
    return next;
  });
  reviews = data.reviews || [];
  if (changed) await writeState("reviews", { reviews });
}

export function listReviews(
  locationId?: string,
  opts?: { sort?: "newest" | "helpful" | "rating"; minRating?: number; sentiment?: ReviewSentiment },
): Review[] {
  let all = [...reviews];
  if (locationId) all = all.filter((r) => r.locationId === locationId);
  if (opts?.minRating) all = all.filter((r) => r.rating >= (opts.minRating as number));
  if (opts?.sentiment) all = all.filter((r) => r.sentiment === opts.sentiment);
  const sort = opts?.sort || "newest";
  all.sort((a, b) => {
    if (sort === "helpful") return b.helpfulVotes - a.helpfulVotes || b.rating - a.rating;
    if (sort === "rating") return b.rating - a.rating || b.helpfulVotes - a.helpfulVotes;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return all;
}

export async function addReview(input: {
  locationId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
}): Promise<Review> {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const title = input.title.trim().slice(0, 80) || "Traveller review";
  const body = input.body.trim().slice(0, 800);
  const row: Review = {
    id: `rev_${randomUUID().slice(0, 8)}`,
    locationId: input.locationId,
    author: input.author.trim().slice(0, 60) || "Guest",
    rating,
    title,
    body,
    createdAt: new Date().toISOString(),
    sentiment: detectSentiment(`${title} ${body}`, rating),
    helpfulVotes: 0,
  };
  reviews.unshift(row);
  reviews = reviews.slice(0, 500);
  await writeState("reviews", { reviews });
  return row;
}

export async function voteHelpful(reviewId: string): Promise<Review | undefined> {
  const idx = reviews.findIndex((r) => r.id === reviewId);
  if (idx < 0) return undefined;
  reviews[idx].helpfulVotes += 1;
  await writeState("reviews", { reviews });
  return reviews[idx];
}

export function summarizeRatings(locationId?: string): RatingSummary[] {
  const all = listReviews(locationId);
  const map = new Map<string, { sum: number; count: number; pos: number }>();
  for (const r of all) {
    const cur = map.get(r.locationId) || { sum: 0, count: 0, pos: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    if (r.sentiment === "positive") cur.pos += 1;
    map.set(r.locationId, cur);
  }
  return Array.from(map.entries()).map(([id, v]) => ({
    locationId: id,
    count: v.count,
    average: Math.round((v.sum / v.count) * 10) / 10,
    positiveShare: Math.round((v.pos / v.count) * 100),
  }));
}

export function getRating(locationId: string): RatingSummary {
  const found = summarizeRatings(locationId)[0];
  return found || { locationId, count: 0, average: 0, positiveShare: 0 };
}
