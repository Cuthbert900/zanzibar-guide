import { Router } from "express";
import { getById, listAttractions, listEvents } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const attractionsRouter = Router();

attractionsRouter.get("/", async (req, res) => {
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  await trackEvent({ type: "attractions_list", channel: "web", intent: "attractions" });
  res.json({
    source: "mock-commission-for-tourism",
    count: listAttractions(tag).length,
    data: listAttractions(tag),
    events: listEvents(),
  });
});

attractionsRouter.get("/:id", (req, res) => {
  const item = getById(req.params.id);
  if (!item || item.type !== "attraction") {
    res.status(404).json({ error: "Attraction not found" });
    return;
  }
  const relatedEvents = listEvents().filter((e) => e.locationId === item.id);
  res.json({ source: "mock-commission-for-tourism", data: item, events: relatedEvents });
});
