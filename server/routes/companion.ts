import { Router } from "express";
import { buildCompanionNudges, fetchFx, fetchWeather, getInventoryCalendar } from "../lib/liveServices";
import { BRAND } from "../../shared/catalog";

export const companionRouter = Router();
export const inventoryRouter = Router();
export const liveRouter = Router();

companionRouter.get("/nudges", async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : BRAND.defaultCenter.lat;
    const lng = req.query.lng ? Number(req.query.lng) : BRAND.defaultCenter.lng;
    const locationIds =
      typeof req.query.locations === "string" ? req.query.locations.split(",").filter(Boolean) : undefined;
    const data = await buildCompanionNudges({ lat, lng, locationIds });
    res.json({ data });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Companion failed" });
  }
});

inventoryRouter.get("/:itemId", (req, res) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const days = req.query.days ? Number(req.query.days) : 14;
  const data = getInventoryCalendar(req.params.itemId, from, days);
  res.json({ data });
});

liveRouter.get("/weather", async (req, res) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : BRAND.defaultCenter.lat;
    const lng = req.query.lng ? Number(req.query.lng) : BRAND.defaultCenter.lng;
    const data = await fetchWeather(lat, lng);
    res.json({ live: true, data });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Weather failed" });
  }
});

liveRouter.get("/fx", async (req, res) => {
  try {
    const base = typeof req.query.base === "string" ? req.query.base : "USD";
    const symbols = typeof req.query.symbols === "string" ? req.query.symbols : "EUR,GBP,ZAR";
    const data = await fetchFx(base, symbols);
    res.json({ live: true, data });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "FX failed" });
  }
});
