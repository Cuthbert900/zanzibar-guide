import { Router } from "express";
import type { InterestTag } from "../../shared/catalog";
import { recommendAccommodations } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const accommodationsRouter = Router();

accommodationsRouter.get("/", async (req, res) => {
  const budgetMax = req.query.budget ? Number(req.query.budget) : undefined;
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  const prefs = typeof req.query.prefs === "string"
    ? (req.query.prefs.split(",").filter(Boolean) as InterestTag[])
    : [];

  const data = recommendAccommodations({
    budgetMax: Number.isFinite(budgetMax) ? budgetMax : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    prefs,
  });

  await trackEvent({ type: "accommodation_recommend", channel: "web", intent: "accommodation", meta: { budgetMax, prefs } });
  res.json({
    source: "mock-accommodation-registry",
    engine: "profile-ranked",
    count: data.length,
    data,
  });
});
