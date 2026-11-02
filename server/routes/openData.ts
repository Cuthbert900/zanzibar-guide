import { Router } from "express";

/**
 * Live open-data connector — OpenStreetMap Nominatim (no API key).
 * Demonstrates Knowledge Integration Layer beyond mocks.
 */
export const openDataRouter = Router();

openDataRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "Zanzibar tourism";
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "1");

    const upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ZanzibarGuide-CassavaAI-Demo/1.0 (tourism chatbot demo)",
        Accept: "application/json",
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Nominatim ${upstream.status}`, source: "openstreetmap-nominatim" });
      return;
    }

    const raw = (await upstream.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
    }>;

    const data = raw.map((r) => ({
      id: `osm_${r.place_id}`,
      name: r.display_name.split(",")[0],
      fullName: r.display_name,
      type: "attraction" as const,
      lat: Number(r.lat),
      lng: Number(r.lon),
      description: `${r.class || "place"} / ${r.type || "poi"} (OpenStreetMap)`,
      source: "openstreetmap-nominatim",
    }));

    res.json({
      source: "openstreetmap-nominatim",
      live: true,
      query: q,
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Open data fetch failed",
      source: "openstreetmap-nominatim",
    });
  }
});
