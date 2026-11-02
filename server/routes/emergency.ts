import { Router } from "express";
import { nearbyEmergency } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const emergencyRouter = Router();

emergencyRouter.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const limit = req.query.limit ? Number(req.query.limit) : 5;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  const data = nearbyEmergency(lat, lng, Number.isFinite(limit) ? limit : 5);
  await trackEvent({
    type: "emergency_nearby",
    channel: "web",
    intent: "emergency",
    meta: { lat, lng, count: data.length },
  });
  res.json({
    source: "geolocation-priority-lookup",
    origin: { lat, lng },
    data,
  });
});
