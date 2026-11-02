import { Router } from "express";
import { CATALOG_LOCATIONS, FAQ_ARTICLES, SAFETY_ADVISORIES } from "../../shared/catalog";
import { ARRIVAL_CHECKLIST, ARRIVAL_OPTIONS } from "../../shared/arrivalLogistics";
import { HERITAGE_STORIES, getStoryByLocationId } from "../../shared/zanzibarStories";
import { callLlm } from "../chat";
import { formatMemoryForPrompt, getMemory, patchMemory } from "../lib/travelerMemory";
import { fetchSuitability } from "../lib/suitabilityWeather";
import { readCms } from "../lib/cmsStore";

export const zanzibarFeaturesRouter = Router();

zanzibarFeaturesRouter.get("/stories", (_req, res) => {
  res.json({
    data: HERITAGE_STORIES.map((s) => ({
      locationId: s.locationId,
      title: s.title,
      tagline: s.tagline,
      durationSec: s.durationSec,
      sceneCount: s.scenes.length,
    })),
  });
});

zanzibarFeaturesRouter.get("/stories/:locationId", async (req, res) => {
  const story = getStoryByLocationId(req.params.locationId);
  if (!story) {
    res.status(404).json({ error: "Story not found for this location" });
    return;
  }
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  if (sessionId) {
    await patchMemory(sessionId, {
      event: { type: "story_viewed", summary: story.title, meta: { locationId: story.locationId } },
    });
  }
  res.json({ data: story });
});

zanzibarFeaturesRouter.post("/stories/narrate", async (req, res) => {
  try {
    const { locationId, sessionId } = req.body as { locationId?: string; sessionId?: string };
    const story = locationId ? getStoryByLocationId(locationId) : HERITAGE_STORIES[0];
    if (!story) {
      res.status(404).json({ error: "Unknown location" });
      return;
    }

    let script = story.scenes.map((s) => `Scene ${s.scene} — ${s.title}: ${s.narration}`).join("\n");
    try {
      const { text } = await callLlm(
        "You polish heritage narration for tourists. Keep facts, warm tone, under 160 words. Return plain text only.",
        `Polish this Zanzibar story as one continuous spoken narration:\n${script}`,
      );
      if (text?.trim()) script = text.trim();
    } catch {
      /* curated fallback */
    }

    if (sessionId) {
      await patchMemory(sessionId, {
        event: { type: "story_viewed", summary: `Narrated ${story.title}`, meta: { locationId: story.locationId } },
      });
    }

    res.json({
      data: {
        locationId: story.locationId,
        title: story.title,
        narration: script,
        scenes: story.scenes,
        tips: story.tips,
        speakText: script,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Narration failed" });
  }
});

zanzibarFeaturesRouter.get("/suitability", async (req, res) => {
  try {
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : "stone-town";
    const days = req.query.days ? Number(req.query.days) : 5;
    const data = await fetchSuitability({ locationId, days });
    res.json({ live: true, data });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Suitability weather failed" });
  }
});

zanzibarFeaturesRouter.get("/arrival", (_req, res) => {
  res.json({ data: { options: ARRIVAL_OPTIONS, checklist: ARRIVAL_CHECKLIST } });
});

zanzibarFeaturesRouter.post("/arrival/quote", (req, res) => {
  const { optionId, passengers } = req.body as { optionId?: string; passengers?: number };
  const opt = ARRIVAL_OPTIONS.find((o) => o.id === optionId);
  if (!opt) {
    res.status(404).json({ error: "Unknown option" });
    return;
  }
  const pax = Math.min(12, Math.max(1, passengers || 1));
  const total = opt.priceUsd * (opt.kind === "sim" ? 1 : pax);
  res.json({
    data: {
      option: opt,
      passengers: pax,
      totalUsd: total,
      confirmationPreview: {
        itemId: opt.id,
        itemName: opt.name,
        itemType: "tour",
        priceLabel: `$${total} for ${pax} pax`,
        requiresConfirm: true,
      },
    },
  });
});

zanzibarFeaturesRouter.post("/policy/ask", async (req, res) => {
  try {
    const { question, sessionId } = req.body as { question?: string; sessionId?: string };
    if (!question?.trim()) {
      res.status(400).json({ error: "question required" });
      return;
    }

    const faqs = FAQ_ARTICLES.filter((f) =>
      /visa|etiquette|emergency|first|malaria|health|booking/i.test(`${f.title} ${f.keywords.join(" ")}`),
    );
    const alerts = SAFETY_ADVISORIES;
    const context = [
      ...faqs.map((f) => `FAQ ${f.id}: ${f.title} — ${f.summary}. ${f.body}`),
      ...alerts.map((a) => `ALERT ${a.id}: ${a.title} (${a.severity}) — ${a.summary}`),
    ].join("\n");

    let answer =
      "For Zanzibar (Tanzania), most visitors need a visa, malaria precautions apply, and modest dress is expected in Stone Town. Check official guidance before travel.";
    try {
      const { text } = await callLlm(
        "You are Zanzibar Guide POLICY mode. Answer only visa, health, safety, etiquette, and regulation questions. Cite FAQ/ALERT ids when relevant. Be concise. Plain text.",
        `Context:\n${context}\n\nQuestion: ${question}`,
      );
      if (text?.trim()) answer = text.trim();
    } catch {
      /* curated fallback below */
      const q = question.toLowerCase();
      if (/visa/.test(q)) answer = alerts.find((a) => a.id === "visa-default")?.summary || answer;
      else if (/malaria|mosquito|health/.test(q)) answer = alerts.find((a) => a.id === "health-malaria")?.summary || answer;
      else if (/dress|etiquette|mosque/.test(q)) answer = faqs.find((f) => f.id === "faq-etiquette-greetings")?.body || answer;
      else if (/tide|ocean|swim|boat/.test(q)) answer = alerts.find((a) => a.id === "safety-ocean")?.summary || answer;
    }

    if (sessionId) {
      await patchMemory(sessionId, {
        event: { type: "policy_asked", summary: question.slice(0, 120) },
        appendNote: `Asked policy: ${question.slice(0, 80)}`,
      });
    }

    res.json({
      data: {
        mode: "policy",
        answer,
        relatedFaqs: faqs.slice(0, 3),
        relatedAlerts: alerts,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Policy mode failed" });
  }
});

zanzibarFeaturesRouter.get("/memory/:sessionId", (req, res) => {
  res.json({ data: getMemory(req.params.sessionId) });
});

zanzibarFeaturesRouter.post("/memory", async (req, res) => {
  const body = req.body as {
    sessionId?: string;
    interests?: string[];
    budgetMax?: number;
    days?: number;
    travelStyle?: string;
    dietary?: string[];
    note?: string;
    eventType?: "itinerary_accepted" | "itinerary_rejected" | "itinerary_generated" | "preference";
    eventSummary?: string;
  };
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }
  const data = await patchMemory(sessionId, {
    interests: body.interests,
    budgetMax: body.budgetMax,
    days: body.days,
    travelStyle: body.travelStyle,
    dietary: body.dietary,
    appendNote: body.note,
    event: body.eventType
      ? { type: body.eventType, summary: body.eventSummary || body.eventType }
      : undefined,
  });
  res.json({ data });
});

zanzibarFeaturesRouter.post("/memory/:sessionId", async (req, res) => {
  const body = req.body as {
    interests?: string[];
    budgetMax?: number;
    days?: number;
    travelStyle?: string;
    dietary?: string[];
    note?: string;
    eventType?: "itinerary_accepted" | "itinerary_rejected" | "itinerary_generated" | "preference";
    eventSummary?: string;
  };
  const data = await patchMemory(req.params.sessionId, {
    interests: body.interests,
    budgetMax: body.budgetMax,
    days: body.days,
    travelStyle: body.travelStyle,
    dietary: body.dietary,
    appendNote: body.note,
    event: body.eventType
      ? { type: body.eventType, summary: body.eventSummary || body.eventType }
      : undefined,
  });
  res.json({ data });
});

zanzibarFeaturesRouter.post("/wizard/build", async (req, res) => {
  try {
    const {
      days,
      budgetMax,
      interests,
      month,
      partySize,
      sessionId,
    } = req.body as {
      days?: number;
      budgetMax?: number;
      interests?: string[];
      month?: string;
      partySize?: number;
      sessionId?: string;
    };

    const dayCount = Math.min(7, Math.max(2, days || 3));
    const interestList = interests?.length ? interests : ["beach", "culture"];
    const catalog = readCms().attractions.filter((a) => a.type === "attraction" || a.type === "hotel");

    const scored = catalog
      .map((a) => {
        let score = 0;
        for (const i of interestList) {
          if ((a.tags || []).some((t) => t.includes(i) || i.includes(t))) score += 3;
          if (a.name.toLowerCase().includes(i) || a.description.toLowerCase().includes(i)) score += 2;
        }
        if (budgetMax != null && a.type === "hotel" && (a.pricePerNight || 999) <= budgetMax) score += 4;
        if (budgetMax != null && a.type === "attraction" && (a.entryFee || 0) <= budgetMax / 10) score += 1;
        if (/beach|nungwi|kendwa|paje|mnemba/.test(a.id) && interestList.some((x) => /beach|relax|dive|kite/.test(x)))
          score += 2;
        if (/stone|spice|jozani|prison/.test(a.id) && interestList.some((x) => /culture|heritage|nature/.test(x)))
          score += 2;
        return { a, score };
      })
      .sort((x, y) => y.score - x.score);

    const picks = scored.slice(0, Math.max(4, dayCount * 2)).map((s) => s.a);
    const planDays = Array.from({ length: dayCount }, (_, i) => {
      const chunk = picks.slice(i * 2, i * 2 + 2);
      const stops = chunk.length ? chunk : [picks[i % picks.length]].filter(Boolean);
      return {
        day: i + 1,
        title: `Day ${i + 1}`,
        locationIds: stops.map((p) => p.id),
        stops,
        notes: stops.map((p) => p.name).join(" → "),
      };
    });

    const summary =
      `${dayCount}-day Zanzibar plan` +
      (month ? ` for ${month}` : "") +
      ` · interests: ${interestList.join(", ")}` +
      (budgetMax ? ` · budget up to $${budgetMax}/night` : "") +
      (partySize ? ` · party of ${partySize}` : "") +
      `. Highlights: ${picks
        .slice(0, 5)
        .map((p) => p.name)
        .join(", ")}.`;

    if (sessionId) {
      await patchMemory(sessionId, {
        interests: interestList,
        budgetMax,
        days: dayCount,
        travelStyle: interestList.join("+"),
        event: { type: "itinerary_generated", summary: summary.slice(0, 160) },
        appendNote: summary.slice(0, 120),
      });
    }

    res.json({
      data: {
        id: `wiz_${Date.now().toString(36)}`,
        title: `${dayCount}-day Zanzibar wizard trip`,
        summary,
        days: planDays,
        memoryHint: sessionId ? formatMemoryForPrompt(sessionId) : undefined,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Wizard failed" });
  }
});

zanzibarFeaturesRouter.get("/landmarks", (_req, res) => {
  res.json({
    data: CATALOG_LOCATIONS.filter((l) => l.type === "attraction").map((l) => ({
      id: l.id,
      name: l.name,
      keywords: [l.name, ...(l.tags || []), ...l.description.toLowerCase().split(/\W+/).filter((w) => w.length > 4)].slice(
        0,
        12,
      ),
    })),
  });
});
