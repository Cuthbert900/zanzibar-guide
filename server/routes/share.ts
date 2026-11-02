import { Router } from "express";
import { getSharedTrip, saveSharedTrip } from "../lib/sharedTrips";

export const shareRouter = Router();

shareRouter.post("/trips", async (req, res) => {
  const { title, summary, days } = req.body as {
    title?: string;
    summary?: string;
    days?: SharedTripBody[];
  };
  if (!title || !Array.isArray(days)) {
    res.status(400).json({ error: "title and days required" });
    return;
  }
  const trip = await saveSharedTrip({
    title,
    summary: summary || "",
    days: days.map((d, i) => ({
      day: d.day || i + 1,
      title: d.title || `Day ${i + 1}`,
      notes: d.notes,
      locationIds: d.locationIds,
    })),
  });
  res.status(201).json({
    data: trip,
    publicPath: `/trip/${trip.id}`,
    note: "Read-only public itinerary link (no login)",
  });
});

shareRouter.get("/trips/:id", (req, res) => {
  const trip = getSharedTrip(req.params.id);
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json({ data: trip });
});

type SharedTripBody = { day?: number; title?: string; notes?: string; locationIds?: string[] };
