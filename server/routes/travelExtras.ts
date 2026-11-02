import { Router } from "express";
import { callLlm } from "../chat";
import { listAttractions } from "../knowledge/mockCommission";

export const travelExtrasRouter = Router();

function stripJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : cleaned);
}

travelExtrasRouter.post("/packing/generate", async (req, res) => {
  try {
    const { destination, days, tripType, activities } = req.body as {
      destination?: string;
      days?: number;
      tripType?: string;
      activities?: string[];
    };
    const dayCount = Math.min(14, Math.max(1, days || 4));
    const dest = destination || "Zanzibar beaches & Stone Town";
    const acts = (activities || ["Beach", "Spice tour", "Stone Town", "Snorkelling"]).join(", ");

    try {
      const { text } = await callLlm(
        "You are a travel packing expert. Return JSON: { summary: string, climateNote: string, items: [{ id, name, category, packed: false, reason }] }. Categories: Clothing, Electronics, Documents, Health, Outdoor.",
        `Create a packing list for a ${dayCount}-day ${tripType || "leisure"} trip to ${dest}. Activities: ${acts}. About 12-18 items.`,
        { json: true },
      );
      const parsed = stripJson(text) as {
        summary?: string;
        climateNote?: string;
        items?: Array<{ id?: string; name: string; category: string; reason?: string }>;
      };
      const items = (parsed.items || []).map((it, i) => ({
        id: it.id || `pk_${i}`,
        name: it.name,
        category: it.category || "Outdoor",
        packed: false,
        reason: it.reason || "",
      }));
      if (items.length) {
        res.json({
          data: {
            summary: parsed.summary || `Packing for ${dayCount} days in ${dest}`,
            climateNote: parsed.climateNote || "Pack layers for warm days and cooler evenings.",
            items,
          },
        });
        return;
      }
    } catch (err) {
      console.warn("[packing] LLM fallback:", err);
    }

    const fallback = [
      { id: "pk_1", name: "Light breathable shirts", category: "Clothing", packed: false, reason: "Hot humid days" },
      { id: "pk_2", name: "Modest cover-up for Stone Town", category: "Clothing", packed: false, reason: "Respect local dress norms" },
      { id: "pk_3", name: "Light rain jacket", category: "Outdoor", packed: false, reason: "Short tropical showers" },
      { id: "pk_4", name: "Sandals + reef shoes", category: "Outdoor", packed: false, reason: "Beach & rocky snorkel entries" },
      { id: "pk_5", name: "Insect repellent", category: "Health", packed: false, reason: "Malaria precautions" },
      { id: "pk_6", name: "Sunscreen SPF 50", category: "Health", packed: false, reason: "Strong equatorial sun" },
      { id: "pk_7", name: "Passport & Tanzania visa", category: "Documents", packed: false, reason: "Immigration" },
      { id: "pk_8", name: "Travel insurance card", category: "Documents", packed: false, reason: "Emergencies" },
      { id: "pk_9", name: "Power bank", category: "Electronics", packed: false, reason: "Long days out" },
      { id: "pk_10", name: "Snorkel mask (optional)", category: "Outdoor", packed: false, reason: "Reef trips" },
      { id: "pk_11", name: "Reusable water bottle", category: "Outdoor", packed: false, reason: "Hydration" },
      { id: "pk_12", name: "Hat & sunglasses", category: "Clothing", packed: false, reason: "Sun protection" },
    ];
    res.json({
      data: {
        summary: `Fallback packing list for ${dayCount} days · ${dest}`,
        climateNote: "Warm days; cool evenings near water; pack for sun and insects.",
        items: fallback,
        fallback: true,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Packing failed" });
  }
});

travelExtrasRouter.post("/souvenirs/recommend", async (req, res) => {
  try {
    const { attractionIds, interests } = req.body as { attractionIds?: string[]; interests?: string[] };
    const catalog = listAttractions();
    const picks = (attractionIds?.length ? catalog.filter((a) => attractionIds.includes(a.id)) : catalog.slice(0, 4)).filter(
      (a) => a.type === "attraction",
    );
    const context = picks.map((p) => `${p.name} (${(p.tags || []).join(",")})`).join("; ") || "Zanzibar, beaches, spice culture";

    try {
      const { text } = await callLlm(
        "You recommend authentic artisan souvenirs. Return JSON: { items: [{ id, name, craft, priceUsd, matchReason, relatedAttraction }] }",
        `Recommend 6 handcrafted souvenirs for travellers interested in: ${context}. Interests: ${(interests || []).join(",") || "culture,nature"}.`,
        { json: true },
      );
      const parsed = stripJson(text) as {
        items?: Array<{ id?: string; name: string; craft?: string; priceUsd?: number; matchReason?: string; relatedAttraction?: string }>;
      };
      if (parsed.items?.length) {
        res.json({
          data: {
            items: parsed.items.map((it, i) => ({
              id: it.id || `souv_${i}`,
              name: it.name,
              craft: it.craft || "Local craft",
              priceUsd: it.priceUsd ?? 25 + i * 10,
              matchReason: it.matchReason || "Pairs with your saved places",
              relatedAttraction: it.relatedAttraction || picks[0]?.name,
            })),
          },
        });
        return;
      }
    } catch (err) {
      console.warn("[souvenirs] LLM fallback:", err);
    }

    res.json({
      data: {
        fallback: true,
        items: [
          { id: "souv_1", name: "Hand-carved dhow model", craft: "Hardwood", priceUsd: 45, matchReason: "Classic craft from Stone Town workshops", relatedAttraction: picks[0]?.name || "Stone Town" },
          { id: "souv_2", name: "Kanga wrap", craft: "Textile", priceUsd: 18, matchReason: "Colourful Swahili design", relatedAttraction: picks[1]?.name || "Stone Town" },
          { id: "souv_3", name: "Clove & spice gift box", craft: "Spices", priceUsd: 22, matchReason: "From a spice-farm visit", relatedAttraction: "Kizimbani Spice Tour" },
          { id: "souv_4", name: "Tingatinga painting", craft: "Painted panel", priceUsd: 35, matchReason: "Bright coastal art", relatedAttraction: picks[0]?.name || "Stone Town" },
          { id: "souv_5", name: "Coconut-shell jewellery", craft: "Shell craft", priceUsd: 20, matchReason: "Lightweight beach souvenir", relatedAttraction: picks[2]?.name || "Nungwi Beach" },
          { id: "souv_6", name: "Miniature drum", craft: "Percussion", priceUsd: 40, matchReason: "Music & cultural keepsake", relatedAttraction: "Stone Town" },
        ],
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Souvenirs failed" });
  }
});

const PHRASE_FALLBACKS: Record<string, Record<string, string>> = {
  Hello: { es: "Hola", fr: "Bonjour", de: "Hallo", sw: "Jambo", sn: "Mhoro", nd: "Sawubona" },
  Thanks: { es: "Gracias", fr: "Merci", de: "Danke", sw: "Asante", sn: "Ndatenda", nd: "Ngiyabonga" },
  "How much?": { es: "¿Cuánto cuesta?", fr: "Combien ça coûte ?", de: "Was kostet das?", sw: "Bei gani?", sn: "Marii?", nd: "Yimalini?" },
  Help: { es: "Ayuda", fr: "Au secours", de: "Hilfe", sw: "Msaada", sn: "Rubatsiro", nd: "Usizo" },
  "Where is the beach?": { es: "¿Dónde está la playa?", fr: "Où est la plage ?", de: "Wo ist der Strand?", sw: "Pwani iko wapi?" },
  "I need a taxi": { es: "Necesito un taxi", fr: "J'ai besoin d'un taxi", de: "Ich brauche ein Taxi", sw: "Nahitaji teksi" },
};

travelExtrasRouter.post("/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body as { text?: string; targetLanguage?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "text required" });
      return;
    }
    const lang = targetLanguage || "Spanish";
    const key = Object.keys(PHRASE_FALLBACKS).find((k) => k.toLowerCase() === text.trim().toLowerCase());
    const langKey = lang.slice(0, 2).toLowerCase();

    try {
      const { text: out } = await callLlm(
        "Translate travel phrases. Return JSON: { translatedText, phonetic, notes }",
        `Translate to ${lang}: "${text}"`,
        { json: true },
      );
      const parsed = stripJson(out) as { translatedText?: string; phonetic?: string; notes?: string };
      if (parsed.translatedText) {
        res.json({ data: { sourceText: text, targetLanguage: lang, ...parsed } });
        return;
      }
    } catch (err) {
      console.warn("[translate] LLM fallback:", err);
    }

    const fb = key ? PHRASE_FALLBACKS[key][langKey] || PHRASE_FALLBACKS[key].es : `[${lang}] ${text}`;
    res.json({
      data: {
        sourceText: text,
        targetLanguage: lang,
        translatedText: fb,
        phonetic: "",
        notes: "Fallback dictionary / passthrough",
        fallback: true,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Translate failed" });
  }
});
