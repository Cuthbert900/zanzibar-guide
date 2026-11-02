import { Router } from "express";
import { getById } from "../knowledge/mockCommission";
import { awardPoints } from "../lib/engagement";
import {
  addReview,
  getRating,
  listReviews,
  summarizeRatings,
  voteHelpful,
  type ReviewSentiment,
} from "../lib/reviews";
import { trackEvent } from "../lib/store";

export const reviewsRouter = Router();

reviewsRouter.get("/", (req, res) => {
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
  const sort = (typeof req.query.sort === "string" ? req.query.sort : "newest") as "newest" | "helpful" | "rating";
  const minRating = req.query.minRating != null ? Number(req.query.minRating) : undefined;
  const sentiment = typeof req.query.sentiment === "string" ? (req.query.sentiment as ReviewSentiment) : undefined;
  const reviews = listReviews(locationId, { sort, minRating, sentiment });
  const summaries = summarizeRatings(locationId);
  res.json({ count: reviews.length, summaries, data: reviews });
});

reviewsRouter.get("/summary/:locationId", (req, res) => {
  const loc = getById(req.params.locationId);
  if (!loc) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.json({ data: getRating(req.params.locationId), location: { id: loc.id, name: loc.name } });
});

reviewsRouter.post("/:id/helpful", async (req, res) => {
  const row = await voteHelpful(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json({ data: row });
});

reviewsRouter.get("/:locationId", (req, res) => {
  const loc = getById(req.params.locationId);
  if (!loc) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const sort = (typeof req.query.sort === "string" ? req.query.sort : "helpful") as "newest" | "helpful" | "rating";
  const minRating = req.query.minRating != null ? Number(req.query.minRating) : undefined;
  const sentiment = typeof req.query.sentiment === "string" ? (req.query.sentiment as ReviewSentiment) : undefined;
  const reviews = listReviews(req.params.locationId, { sort, minRating, sentiment });
  res.json({
    location: { id: loc.id, name: loc.name },
    summary: getRating(req.params.locationId),
    data: reviews,
  });
});

reviewsRouter.post("/", async (req, res) => {
  const body = req.body as {
    locationId?: string;
    author?: string;
    rating?: number;
    title?: string;
    body?: string;
    userKey?: string;
  };
  if (!body.locationId || !getById(body.locationId)) {
    res.status(400).json({ error: "Valid locationId required" });
    return;
  }
  if (body.rating == null || !Number.isFinite(Number(body.rating))) {
    res.status(400).json({ error: "rating 1–5 required" });
    return;
  }
  if (!body.body?.trim()) {
    res.status(400).json({ error: "Review body required" });
    return;
  }

  const row = await addReview({
    locationId: body.locationId,
    author: body.author || "Guest",
    rating: Number(body.rating),
    title: body.title || "",
    body: body.body,
  });

  if (body.userKey) await awardPoints(body.userKey, 20, "review");

  await trackEvent({
    type: "review_submit",
    channel: "web",
    intent: "reviews",
    meta: { locationId: row.locationId, rating: row.rating, sentiment: row.sentiment },
  });

  res.status(201).json({ data: row, summary: getRating(row.locationId) });
});
