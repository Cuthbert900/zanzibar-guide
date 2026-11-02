import { Router } from "express";
import { CATALOG_LOCATIONS } from "../../shared/catalog";
import type { CitationSource } from "../../shared/sources";
import { generateTourismReply } from "../chat";

export const visionRouter = Router();

/** Zanzibar-focused keyword / visual cue matching for photo ID. */
function guessFromMeta(caption?: string, filename?: string) {
  const hay = `${caption || ""} ${filename || ""}`.toLowerCase();
  const scored = CATALOG_LOCATIONS.filter((l) => l.type === "attraction" || l.type === "hotel").map((l) => {
    let score = 0;
    for (const t of [...(l.tags || []), ...l.name.toLowerCase().split(/\s+/)]) {
      if (t.length > 2 && hay.includes(t.toLowerCase())) score += 2;
    }
    // Zanzibar landmark cues
    if (/stone.?town|forodhani|carved door|old fort|house of wonders|alley/.test(hay) && l.id === "stone-town") score += 5;
    if (/nungwi|north.?coast|dhow sunset/.test(hay) && l.id === "nungwi") score += 5;
    if (/kendwa/.test(hay) && l.id === "kendwa") score += 5;
    if (/paje|kite|kitesurf|east.?coast/.test(hay) && l.id === "paje") score += 5;
    if (/prison.?island|changuu|tortoise/.test(hay) && l.id === "prison-island") score += 5;
    if (/jozani|colobus|mangrove|monkey/.test(hay) && l.id === "jozani") score += 5;
    if (/spice|clove|cinnamon|nutmeg|kizimbani/.test(hay) && l.id === "spice-tour") score += 5;
    if (/mnemba|reef|snorkel|atoll|dive/.test(hay) && l.id === "mnemba") score += 4;
    if (/beach|sand|turquoise|ocean|palm/.test(hay) && /nungwi|kendwa|paje/.test(l.id)) score += 2;
    if (/hotel|lodge|resort|villa|room|receipt|invoice/.test(hay) && l.type === "hotel") score += 2;
    if (/hyatt|seafront|stone town hotel/.test(hay) && l.id === "park-hyatt-znz") score += 3;
    if (/emerson|rooftop|hurumzi/.test(hay) && l.id === "emerson-spice") score += 3;
    return { l, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.l);
}

async function tryOpenAiVision(imageBase64: string, prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const raw = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${raw}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

visionRouter.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, caption, filename, sessionId } = req.body as {
      imageBase64?: string;
      caption?: string;
      filename?: string;
      sessionId?: string;
    };
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 required" });
      return;
    }

    const isReceipt = /receipt|invoice|bill|payment/i.test(`${caption || ""} ${filename || ""}`);
    const catalogNames = CATALOG_LOCATIONS.filter((l) => l.type === "attraction")
      .map((l) => l.name)
      .join(", ");
    const prompt = isReceipt
      ? "This may be a travel receipt in Zanzibar/Tanzania. Summarize merchant, amount if visible, and whether it looks like lodging, activity, ferry, or transport. Be concise."
      : `Identify the likely Zanzibar tourism attraction or place. Prefer matches among: ${catalogNames}. Describe landmarks briefly (Stone Town alleys, beaches, spice farms, Jozani monkeys, Prison Island tortoises, etc.). If unsure, say so.`;

    let visionText = await tryOpenAiVision(imageBase64, prompt);
    const matches = guessFromMeta(caption || visionText || "", filename);
    const sources: CitationSource[] = [
      {
        id: "vision_input",
        kind: "vision",
        title: isReceipt ? "Receipt / document scan" : "Zanzibar photo identification",
        detail: filename || "uploaded image",
      },
      ...matches.map((m) => ({
        id: m.id,
        kind: "cms" as const,
        title: m.name,
        detail: m.description.slice(0, 100),
      })),
    ];

    if (!visionText) {
      if (matches.length) {
        visionText = isReceipt
          ? `I couldn't fully OCR this without a vision model, but based on your caption/filename it may relate to **${matches[0].name}** (${matches[0].price || "price on request"}). You can book from the card below or ask me to explain the charge.`
          : `Based on visual cues and your note, this looks most like **${matches[0].name}**. ${matches[0].description} Hours: ${matches[0].hours || "n/a"}.`;
      } else {
        visionText =
          "I received your photo. Add a short caption (e.g. “Stone Town door”, “Nungwi beach”, “spice farm”, “red colobus”) for a sharper Zanzibar match — or set OPENAI_API_KEY for full vision.";
      }
    }

    const follow = await generateTourismReply(
      [
        {
          role: "user",
          content: `${visionText}\n\nUser caption: ${caption || "(none)"}. ${
            isReceipt
              ? "Help interpret this travel expense and suggest related Zanzibar bookings if relevant."
              : "Confirm the Zanzibar place and suggest nearby tips (beach, spice tour, or Stone Town)."
          }`,
        },
      ],
      { sessionId },
    );

    res.json({
      data: {
        content: follow.content,
        visionNote: visionText,
        locations: follow.locations.length ? follow.locations : matches,
        faqLinks: follow.faqLinks,
        alerts: follow.alerts,
        sources: [...sources, ...(follow.sources || [])],
        matchedIds: matches.map((m) => m.id),
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Vision analyze failed" });
  }
});
