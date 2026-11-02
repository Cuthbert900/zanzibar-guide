import { Router } from "express";
import { listAlerts, listSafety } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const safetyRouter = Router();

safetyRouter.get("/", async (_req, res) => {
  await trackEvent({ type: "safety_view", channel: "web", intent: "safety" });
  res.json({
    source: "mock-dynamic-compliance-feed",
    data: listSafety(),
  });
});

safetyRouter.get("/alerts", async (_req, res) => {
  await trackEvent({ type: "safety_alerts", channel: "web", intent: "safety" });
  res.json({
    source: "mock-rule-based-alerts",
    data: listAlerts(),
  });
});
