import { Router } from "express";
import { readCms } from "../lib/cmsStore";
import { generateTourismReply } from "../chat";
import { authFromHeader, updateUser } from "../lib/users";
import { randomUUID } from "crypto";

export const itineraryRouter = Router();

itineraryRouter.post("/build", async (req, res) => {
  try {
    const { prompt, days } = req.body as { prompt?: string; days?: number };
    const dayCount = Math.min(7, Math.max(2, days || 3));
    const catalog = readCms().attractions.filter((a) => a.type === "attraction" || a.type === "hotel");
    const ids = catalog.map((c) => c.id).join(", ");

    const reply = await generateTourismReply(
      [
        {
          role: "user",
          content: `Build a ${dayCount}-day Zanzibar itinerary. ${prompt || "Highlight Stone Town, spice tour, and a north-coast beach."}
Respond JSON with content summarizing the plan AND locationIds for stops in visit order.
Available ids: ${ids}`,
        },
      ],
      { sessionId: "itinerary" },
    );

    const locs = reply.locations.length ? reply.locations : catalog.slice(0, dayCount * 2);
    const planDays = Array.from({ length: dayCount }, (_, i) => {
      const chunk = locs.slice(i * 2, i * 2 + 2);
      const picks = chunk.length ? chunk : [locs[i % locs.length]].filter(Boolean);
      return {
        day: i + 1,
        title: `Day ${i + 1}`,
        locationIds: picks.map((p) => p.id),
        stops: picks,
        notes: picks.map((p) => p.name).join(" → "),
      };
    });

    const trip = {
      id: `trip_${randomUUID().slice(0, 8)}`,
      title: prompt?.slice(0, 60) || `${dayCount}-day adventure`,
      days: planDays,
      summary: reply.content,
      createdAt: new Date().toISOString(),
    };

    const user = authFromHeader(req.headers.authorization);
    if (user) {
      await updateUser(user.id, {
        trips: [
          {
            id: trip.id,
            title: trip.title,
            days: planDays.map((d) => ({ day: d.day, title: d.title, locationIds: d.locationIds, notes: d.notes })),
            createdAt: trip.createdAt,
          },
          ...user.trips,
        ].slice(0, 20),
      });
    }

    res.json({ data: trip });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Itinerary failed" });
  }
});
