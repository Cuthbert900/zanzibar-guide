import { Router } from "express";
import type { BudgetTier, InterestTag, LocationType, TourismLocation } from "../../shared/catalog";
import { readCms } from "../lib/cmsStore";
import { cityCenterDistanceKm } from "../lib/engagement";
import { getRating, summarizeRatings } from "../lib/reviews";
import { trackEvent } from "../lib/store";

export const catalogRouter = Router();

type SortKey = "relevance" | "price_asc" | "price_desc" | "rating" | "name" | "distance";

function usdPrice(loc: TourismLocation): number | null {
  if (loc.type === "hotel" && loc.pricePerNight != null) return loc.pricePerNight;
  if (loc.entryFee != null) return loc.entryFee;
  return null;
}

catalogRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const type = typeof req.query.type === "string" ? (req.query.type as LocationType | "all") : "all";
  const tags =
    typeof req.query.tags === "string"
      ? (req.query.tags.split(",").filter(Boolean) as InterestTag[])
      : [];
  const budgetMin = req.query.budgetMin != null ? Number(req.query.budgetMin) : undefined;
  const budgetMax = req.query.budgetMax != null ? Number(req.query.budgetMax) : undefined;
  const minRating = req.query.minRating != null ? Number(req.query.minRating) : undefined;
  const maxDistanceKm = req.query.maxDistanceKm != null ? Number(req.query.maxDistanceKm) : undefined;
  const budgetTier = typeof req.query.budgetTier === "string" ? (req.query.budgetTier as BudgetTier) : undefined;
  const wheelchair = req.query.wheelchair === "1" || req.query.wheelchair === "true";
  const family = req.query.family === "1" || req.query.family === "true";
  const pet = req.query.pet === "1" || req.query.pet === "true";
  const audioGuide = req.query.audioGuide === "1" || req.query.audioGuide === "true";
  const sort = (typeof req.query.sort === "string" ? req.query.sort : "relevance") as SortKey;

  const ratings = new Map(summarizeRatings().map((r) => [r.locationId, r]));
  let items = readCms().attractions.filter((l) => l.type === "attraction" || l.type === "hotel");

  if (type && type !== "all") items = items.filter((l) => l.type === type);
  if (tags.length) items = items.filter((l) => tags.every((t) => (l.tags || []).includes(t)));
  if (q) {
    items = items.filter((l) => {
      const hay = `${l.name} ${l.description} ${(l.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (Number.isFinite(budgetMin) || Number.isFinite(budgetMax)) {
    items = items.filter((l) => {
      const p = usdPrice(l);
      if (p == null) return false;
      if (Number.isFinite(budgetMin) && p < (budgetMin as number)) return false;
      if (Number.isFinite(budgetMax) && p > (budgetMax as number)) return false;
      return true;
    });
  }
  if (budgetTier) items = items.filter((l) => l.budgetTier === budgetTier);
  if (Number.isFinite(minRating) && (minRating as number) > 0) {
    items = items.filter((l) => (ratings.get(l.id)?.average || 0) >= (minRating as number));
  }
  if (wheelchair) items = items.filter((l) => l.wheelchairAccessible);
  if (family) items = items.filter((l) => l.familyFriendly);
  if (pet) items = items.filter((l) => l.petFriendly);
  if (audioGuide) items = items.filter((l) => l.audioGuide);

  const scored = items
    .map((l) => {
      const rating = ratings.get(l.id) || getRating(l.id);
      const distanceKm = Math.round(cityCenterDistanceKm(l.lat, l.lng) * 10) / 10;
      let relevance = 0;
      if (q) {
        if (l.name.toLowerCase().includes(q)) relevance += 40;
        if (l.description.toLowerCase().includes(q)) relevance += 15;
      }
      relevance += (l.tags || []).length * 2 + rating.average * 5 + rating.count;
      return {
        ...l,
        usdPrice: usdPrice(l),
        ratingAverage: rating.average,
        ratingCount: rating.count,
        distanceKm,
        relevance,
      };
    })
    .filter((l) => !Number.isFinite(maxDistanceKm) || l.distanceKm <= (maxDistanceKm as number));

  scored.sort((a, b) => {
    if (sort === "price_asc") return (a.usdPrice ?? 99999) - (b.usdPrice ?? 99999);
    if (sort === "price_desc") return (b.usdPrice ?? -1) - (a.usdPrice ?? -1);
    if (sort === "rating") return b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "distance") return a.distanceKm - b.distanceKm;
    return b.relevance - a.relevance;
  });

  await trackEvent({
    type: "catalog_search",
    channel: "web",
    intent: "search",
    meta: { q, type, tags, sort, count: scored.length },
  });

  res.json({
    source: "cms-catalog+reviews",
    count: scored.length,
    filters: {
      q,
      type,
      tags,
      budgetMin,
      budgetMax,
      minRating,
      maxDistanceKm,
      budgetTier,
      wheelchair,
      family,
      pet,
      audioGuide,
      sort,
    },
    data: scored,
  });
});

catalogRouter.get("/facets", (_req, res) => {
  const locs = readCms().attractions.filter((l) => l.type === "attraction" || l.type === "hotel");
  const tagSet = new Set<string>();
  for (const l of locs) for (const t of l.tags || []) tagSet.add(t);
  res.json({
    data: {
      types: ["attraction", "hotel"],
      tags: Array.from(tagSet).sort(),
      budgetTiers: ["budget", "midrange", "luxury"],
      a11y: ["wheelchair", "family", "pet", "audioGuide"],
      sorts: ["relevance", "price_asc", "price_desc", "rating", "name", "distance"],
    },
  });
});
