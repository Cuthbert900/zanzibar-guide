import { Router } from "express";
import { analyticsSummary, trackEvent } from "../lib/store";

export const analyticsRouter = Router();

analyticsRouter.post("/events", async (req, res) => {
  const body = req.body as {
    type?: string;
    channel?: "web" | "widget" | "whatsapp";
    intent?: string;
    meta?: Record<string, unknown>;
  };
  if (!body.type) {
    res.status(400).json({ error: "type required" });
    return;
  }
  const row = await trackEvent({
    type: body.type,
    channel: body.channel || "web",
    intent: body.intent,
    meta: body.meta,
  });
  res.status(201).json({ data: row });
});

analyticsRouter.get("/summary", (_req, res) => {
  res.json({ data: analyticsSummary() });
});
