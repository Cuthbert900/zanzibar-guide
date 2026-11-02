import { Router } from "express";
import { DINING_VENUES, type DietaryTag } from "../../shared/catalog";
import {
  addSpend,
  awardPoints,
  checkPriceAlerts,
  comparePrices,
  createCollabTrip,
  createPriceAlert,
  exclusiveDeal,
  getCollabTrip,
  getFavoriteShare,
  getOrCreateProfile,
  leaderboard,
  listPriceAlerts,
  listSpend,
  peopleAlsoVisited,
  shareFavorites,
  spendSummary,
  travelLeg,
  trendingNow,
  updateCollabTrip,
} from "../lib/engagement";
import { getById } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";
import { pushNotification } from "../lib/notifications";

export const engagementRouter = Router();

engagementRouter.get("/trending", (_req, res) => {
  res.json({ data: trendingNow() });
});

engagementRouter.get("/also-visited/:id", (req, res) => {
  res.json({ data: peopleAlsoVisited(req.params.id) });
});

engagementRouter.post("/compare", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]).slice(0, 6) : [];
  if (!ids.length) {
    res.status(400).json({ error: "ids[] required" });
    return;
  }
  res.json({ data: comparePrices(ids, req.body?.date) });
});

engagementRouter.get("/dining", (req, res) => {
  const cuisine = typeof req.query.cuisine === "string" ? req.query.cuisine : undefined;
  const dietary = typeof req.query.dietary === "string" ? (req.query.dietary as DietaryTag) : undefined;
  const max = req.query.maxMeal != null ? Number(req.query.maxMeal) : undefined;
  let rows = [...DINING_VENUES];
  if (cuisine) rows = rows.filter((d) => d.cuisine === cuisine);
  if (dietary) rows = rows.filter((d) => d.dietary.includes(dietary));
  if (Number.isFinite(max)) rows = rows.filter((d) => d.avgMealUsd <= (max as number));
  res.json({ count: rows.length, data: rows });
});

engagementRouter.post("/price-alerts", async (req, res) => {
  const { itemId, targetUsd, email } = req.body as { itemId?: string; targetUsd?: number; email?: string };
  if (!itemId || !getById(itemId) || !Number.isFinite(Number(targetUsd))) {
    res.status(400).json({ error: "itemId and targetUsd required" });
    return;
  }
  const row = await createPriceAlert(itemId, Number(targetUsd), email);
  await trackEvent({ type: "price_alert", channel: "web", intent: "alerts", meta: { itemId, targetUsd } });
  res.status(201).json({ data: row });
});

engagementRouter.get("/price-alerts", (_req, res) => {
  res.json({ data: listPriceAlerts() });
});

engagementRouter.post("/price-alerts/check", async (_req, res) => {
  const triggered = await checkPriceAlerts();
  for (const a of triggered) {
    await pushNotification({
      channel: "whatsapp",
      to: a.email || "traveller",
      title: "Price drop alert",
      body: `${a.itemName} is now $${a.lastPriceUsd} (target $${a.targetUsd})`,
      meta: { itemId: a.itemId, stub: true },
    });
  }
  res.json({ data: triggered, note: "Demo: triggered alerts logged to notification store" });
});

engagementRouter.get("/spending", (_req, res) => {
  res.json({ data: listSpend(), summary: spendSummary() });
});

engagementRouter.post("/spending", async (req, res) => {
  const body = req.body as {
    date?: string;
    category?: "lodging" | "food" | "activities" | "transport" | "other";
    amountUsd?: number;
    note?: string;
  };
  if (!body.category || !Number.isFinite(Number(body.amountUsd))) {
    res.status(400).json({ error: "category and amountUsd required" });
    return;
  }
  const row = await addSpend({
    date: body.date || new Date().toISOString().slice(0, 10),
    category: body.category,
    amountUsd: Number(body.amountUsd),
    note: body.note,
  });
  res.status(201).json({ data: row, summary: spendSummary() });
});

engagementRouter.get("/gamification/:userKey", async (req, res) => {
  const p = await getOrCreateProfile(req.params.userKey);
  res.json({ data: p, deal: await exclusiveDeal(req.params.userKey), badgeLabels: {
    explorer: "Explorer",
    culture: "Culture Enthusiast",
    reviewer: "Helpful Reviewer",
    booker: "Seasoned Booker",
    vip: "VIP Traveller",
  } });
});

engagementRouter.post("/gamification/:userKey/award", async (req, res) => {
  const reason = (req.body?.reason || "visit") as "review" | "booking" | "visit" | "recommend";
  const pts = Number(req.body?.points) || (reason === "review" ? 20 : reason === "booking" ? 40 : 10);
  const p = await awardPoints(req.params.userKey, pts, reason);
  res.json({ data: p, deal: await exclusiveDeal(req.params.userKey) });
});

engagementRouter.get("/leaderboard", (_req, res) => {
  res.json({ data: leaderboard() });
});

engagementRouter.post("/favorites/share", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "items required" });
    return;
  }
  const row = await shareFavorites(items, req.body?.title);
  res.status(201).json({ data: row, publicPath: `/favorites/${row.id}` });
});

engagementRouter.get("/favorites/:id", (req, res) => {
  const row = getFavoriteShare(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  res.json({ data: row });
});

engagementRouter.post("/collab/trips", async (req, res) => {
  const title = req.body?.title || "Our trip";
  const days = Array.isArray(req.body?.days) ? req.body.days : [{ day: 1, title: "Day 1", locationIds: [] }];
  const row = await createCollabTrip(title, days, req.body?.member || "host");
  res.status(201).json({ data: row, path: `/collab/${row.id}` });
});

engagementRouter.get("/collab/trips/:id", (req, res) => {
  const row = getCollabTrip(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json({ data: row });
});

engagementRouter.patch("/collab/trips/:id", async (req, res) => {
  const row = await updateCollabTrip(req.params.id, {
    title: req.body?.title,
    days: req.body?.days,
  }, req.body?.member);
  if (!row) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json({ data: row });
});

engagementRouter.post("/travel-times", (req, res) => {
  const stops = Array.isArray(req.body?.stops) ? req.body.stops : [];
  if (stops.length < 2) {
    res.status(400).json({ error: "Need at least 2 stops with lat/lng/name" });
    return;
  }
  const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    legs.push(travelLeg(stops[i], stops[i + 1]));
  }
  res.json({ data: { legs } });
});

engagementRouter.get("/seasonal/:id", (req, res) => {
  const loc = getById(req.params.id);
  if (!loc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    data: {
      id: loc.id,
      bestSeason: loc.bestSeason,
      crowdLevel: loc.crowdLevel,
      weatherHint:
        loc.crowdLevel === "busy"
          ? "Expect queues — visit at opening time"
          : "Usually quieter; flexible timing works",
      alsoTry: peopleAlsoVisited(loc.id).slice(0, 3).map((x) => ({ id: x.id, name: x.name })),
    },
  });
});
