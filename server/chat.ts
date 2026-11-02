import {
  BRAND,
  FAQ_ARTICLES,
  SAFETY_ADVISORIES,
  buildSystemPrompt,
  type FaqArticle,
  type SafetyAdvisory,
  type TourismLocation,
} from "../shared/catalog";
import type { CitationSource } from "../shared/sources";
import { getById, retrievalBundle } from "./knowledge/mockCommission";
import { getContext } from "./lib/store";
import { formatRagContext, retrieveChunks, type RagChunk } from "./lib/rag";
import { authFromHeader } from "./lib/users";
import { formatMemoryForPrompt } from "./lib/travelerMemory";

import { activeModelTraffic, selectModelProvider, withModelTraffic } from "./lib/modelRouting";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  locations: TourismLocation[];
  faqLinks: FaqArticle[];
  alerts: SafetyAdvisory[];
  bookingSuggestions: TourismLocation[];
  sources: CitationSource[];
  provider: string;
  model: string;
  uiHints?: {
    quickReplies?: string[];
    cards?: Array<{ id: string; title: string; subtitle?: string; imageUrl?: string; tags?: string[] }>;
    mapPins?: Array<{ id: string; name: string; lat: number; lng: number }>;
  };
}

interface ModelReply {
  content?: string;
  locationIds?: string[];
  faqIds?: string[];
  alertIds?: string[];
}

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Fix common LLM JSON mistakes: invalid \\ escapes, trailing commas, smart quotes */
function sanitizeJsonText(text: string): string {
  let s = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");

  // Incomplete unicode escapes: \uXX → drop backslash
  s = s.replace(/\\u(?![0-9a-fA-F]{4})/g, "u");

  // Replace invalid JSON escape sequences (e.g. \', \a, bare \) with safe forms
  s = s.replace(/\\([^"\\/bfnrtu])/g, (_, ch: string) => {
    if (ch === "'") return "'";
    return ch;
  });

  return s;
}

function tryParseJson(text: string): ModelReply | null {
  const candidates = [text, sanitizeJsonText(text)];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ModelReply;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}

function extractField(raw: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const m = raw.match(re);
  if (!m) {
    // Non-greedy fallback for broken escapes inside the string
    const loose = raw.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*[,}]`));
    return loose?.[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function extractStringArray(raw: string, key: string): string[] {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`);
  const m = raw.match(re);
  if (!m) return [];
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map((x) => x[1]);
}

function parseModelJson(raw: string): ModelReply {
  try {
    const cleaned = stripFences(raw);

    const direct = tryParseJson(cleaned);
    if (direct) return direct;

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const nested = tryParseJson(match[0]);
      if (nested) return nested;
    }

    const content = extractField(cleaned, "content");
    return {
      content: (content || cleaned).slice(0, 4000),
      locationIds: extractStringArray(cleaned, "locationIds"),
      faqIds: extractStringArray(cleaned, "faqIds"),
      alertIds: extractStringArray(cleaned, "alertIds"),
    };
  } catch (err) {
    console.warn("[chat] parseModelJson fallback:", err);
    return {
      content: stripFences(raw).slice(0, 2000) || "Sorry — I had trouble formatting that reply. Please try again.",
      locationIds: [],
    };
  }
}



function resolveLocations(ids: string[] | undefined): TourismLocation[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: TourismLocation[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const loc = getById(id);
    if (loc) {
      seen.add(id);
      out.push(loc);
    }
  }
  return out.slice(0, 5);
}

function resolveFaqs(ids: string[] | undefined): FaqArticle[] {
  if (!ids?.length) return [];
  return FAQ_ARTICLES.filter((f) => ids.includes(f.id)).slice(0, 3);
}

function resolveAlerts(ids: string[] | undefined): SafetyAdvisory[] {
  if (!ids?.length) return [];
  return SAFETY_ADVISORIES.filter((a) => ids.includes(a.id)).slice(0, 3);
}

function buildRetrievalContext(lastUserMessage: string, sessionId?: string, authHeader?: string): string {
  const ctx = sessionId ? getContext(sessionId) : null;
  const bundle = retrievalBundle(lastUserMessage);
  const lines: string[] = [];

  const user = authFromHeader(authHeader);
  if (user?.travelProfile) {
    const p = user.travelProfile;
    lines.push(
      `learnedProfile=style:${p.travelStyle}; interests:${p.interests.join(",")}; budgetMax:${p.budgetMax ?? "n/a"}; bookings:${p.bookingCount}`,
    );
    if (p.historySummary) lines.push(`travelHistory=${p.historySummary}`);
    if (p.badges?.length) lines.push(`badges=${p.badges.map((b) => b.label).join(",")}`);
  }

  if (ctx) {
    lines.push(
      `language=${ctx.language}; budgetMax=${ctx.budgetMax ?? "n/a"}; partySize=${ctx.partySize}; interests=${ctx.interests.join(",") || "none"}`,
    );
    if (ctx.historySummary) lines.push(`historySummary=${ctx.historySummary}`);
  }
  if (bundle.attractions.length) {
    lines.push(
      "Retrieved attractions: " +
        bundle.attractions.map((a) => `${a.id}(${a.hours}, ${a.price})`).join("; "),
    );
  }
  if (bundle.hotels.length) {
    lines.push(
      "Ranked hotels: " +
        bundle.hotels
          .slice(0, 3)
          .map((h) => `${h.id}(score=${Math.round(h.score)}, ${h.price})`)
          .join("; "),
    );
  }
  if (bundle.faqs.length) {
    lines.push("Relevant FAQ: " + bundle.faqs.map((f) => `${f.id}:${f.title}`).join("; "));
  }
  if (bundle.alerts.length) {
    lines.push("Active alerts: " + bundle.alerts.map((a) => `${a.id}:${a.title}`).join("; "));
  }
  if (bundle.events.length) {
    lines.push("Events: " + bundle.events.map((e) => `${e.id}:${e.name}`).join("; "));
  }
  const rag = formatRagContext(lastUserMessage);
  if (rag) lines.push(rag);
  if (sessionId) {
    const mem = formatMemoryForPrompt(sessionId);
    if (mem) lines.push(`travelerMemory:\n${mem}`);
  }
  return lines.join("\n");
}

function buildSources(
  lastUser: string,
  locations: TourismLocation[],
  faqs: FaqArticle[],
  alerts: SafetyAdvisory[],
): CitationSource[] {
  const sources: CitationSource[] = [];
  for (const l of locations) {
    sources.push({ id: l.id, kind: "cms", title: l.name, detail: l.hours || l.price, confidence: "high" });
  }
  for (const f of faqs) {
    sources.push({ id: f.id, kind: "faq", title: f.title, detail: f.summary, url: f.deepLink, confidence: "high" });
  }
  for (const a of alerts) {
    sources.push({
      id: a.id,
      kind: "alert",
      title: a.title,
      detail: a.summary,
      url: a.sourceUrl,
      confidence: a.severity === "alert" ? "high" : "medium",
    });
  }
  const { sources: ragSources } = retrieveChunks(lastUser, 2);
  sources.push(
    ...ragSources.map((s) => ({
      ...s,
      confidence: (s.page != null ? "high" : "medium") as CitationSource["confidence"],
    })),
  );
  const bundle = retrievalBundle(lastUser);
  if (!locations.length && bundle.attractions[0]) {
    sources.push({
      id: bundle.attractions[0].id,
      kind: "cms",
      title: bundle.attractions[0].name,
      detail: "retrieved via knowledge layer",
      confidence: "medium",
    });
  }
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

async function callOllama(system: string, messages: ChatTurn[]): Promise<{ text: string; model: string }> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      options: { temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${errText || res.statusText}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) throw new Error("Empty response from Ollama");
  return { text, model: OLLAMA_MODEL };
}

async function callOpenAI(system: string, messages: ChatTurn[]): Promise<{ text: string; model: string }> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText || res.statusText}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from OpenAI");
  return { text, model: OPENAI_MODEL };
}

async function callGemini(system: string, messages: ChatTurn[]): Promise<{ text: string; model: string }> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${errText || res.statusText}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty response from Gemini");
  return { text, model: GEMINI_MODEL };
}

async function generateRaw(
  system: string,
  messages: ChatTurn[],
): Promise<{ text: string; provider: string; model: string }> {
  const prefer = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";

  if (prefer === "openai") {
    const { text, model } = await callOpenAI(system, messages);
    return { text, provider: "openai", model };
  }
  if (prefer === "gemini") {
    const { text, model } = await callGemini(system, messages);
    return { text, provider: "gemini", model };
  }
  if (prefer === "ollama") {
    const { text, model } = await callOllama(system, messages);
    return { text, provider: "ollama", model };
  }

  const availableProviders = [
    ...(OPENAI_API_KEY ? (["openai"] as const) : []),
    ...(GEMINI_API_KEY ? (["gemini"] as const) : []),
  ];
  const primaryProvider = selectModelProvider(latestUserMessage, availableProviders, activeModelTraffic);
  const providers = primaryProvider
    ? [primaryProvider, ...availableProviders.filter((provider) => provider !== primaryProvider)]
    : [];

  for (const provider of providers) {
    try {
      const result = await withModelTraffic(provider, () =>
        provider === "openai" ? callOpenAI(system, messages) : callGemini(system, messages),
      );
      return { ...result, provider };
    } catch (err) {
      console.warn(`[chat] ${provider} failed, trying next provider:`, err);
    }
  }

  const { text, model } = await callOllama(system, messages);
  return { text, provider: "ollama", model };
}

/** Public LLM helper for packing / souvenirs / translate (JSON or free text). */
export async function callLlm(
  system: string,
  userMessage: string,
  opts?: { json?: boolean },
): Promise<{ text: string; provider: string; model: string }> {
  const sys = opts?.json
    ? `${system}\n\nRespond with valid JSON only (no markdown fences).`
    : system;
  return generateRaw(sys, [{ role: "user", content: userMessage }]);
}

export async function generateTourismReply(
  messages: ChatTurn[],
  opts?: { sessionId?: string; authHeader?: string },
): Promise<ChatResult> {
  if (!messages.length) throw new Error("messages required");

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  let retrieval = buildRetrievalContext(lastUser, opts?.sessionId, opts?.authHeader);

  // Try vector-backed retrieval (Qdrant) and append high-confidence snippets to the retrieval context.
  // This is a best-effort dynamic import; if the vector helper is unavailable we'll fall back to text retrieval.
  try {
    const { vectorRetrieve } = await import("./lib/ragVector");
    const vr = await vectorRetrieve(lastUser, 3);
    if (vr && vr.chunks && vr.chunks.length) {
      const vecText = vr.chunks
        .map((c: RagChunk) => `[${c.docTitle}${c.page ? ` p.${c.page}` : ""}] ${c.text}`)
        .join("\n---\n");
      retrieval = retrieval ? `${retrieval}\nVector retrieval:\n${vecText}` : `Vector retrieval:\n${vecText}`;
    }
  } catch (err) {
    /* noop */
  }

  const system = buildSystemPrompt(retrieval);

  const { text, provider, model } = await generateRaw(system, messages);
  const parsed = parseModelJson(text);
  const locations = resolveLocations(parsed.locationIds);
  const faqLinks = resolveFaqs(parsed.faqIds);
  const alerts = resolveAlerts(parsed.alertIds);

  const bundle = retrievalBundle(lastUser);
  const enrichedFaqs = faqLinks.length ? faqLinks : bundle.faqs.slice(0, 2);
  const enrichedAlerts =
    alerts.length || !/visa|health|safe|malaria|emergency/i.test(lastUser)
      ? alerts
      : bundle.alerts.slice(0, 2);

  const bookingSuggestions = locations.filter((l) => l.type === "hotel" || l.type === "attraction");
  const sources = buildSources(lastUser, locations, enrichedFaqs, enrichedAlerts);

  // Lightweight UI hints derived from the structured result so the frontend can render rich widgets.
  const uiHints = {
    quickReplies: (() => {
      const q: string[] = [];
      if (locations.length) {
        q.push("Show these places on the map", "Save places", "Create a day plan");
        if (locations.some((l) => l.familyFriendly)) q.push("Family-friendly options");
      } else {
        q.push("Find attractions", "Suggest an itinerary", "Show local tips");
      }
      return q;
    })(),
    cards: locations.map((l) => ({
      id: l.id,
      title: l.name,
      subtitle: l.description ? (l.description.length > 140 ? l.description.slice(0, 137) + "..." : l.description) : undefined,
      imageUrl: l.imageUrl,
      tags: l.tags || [],
    })),
    mapPins: locations.map((l) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng })),
  };

  return {
    content:
      parsed.content?.trim() ||
      `I can help with attractions, hotels, safety, FAQs, and bookings via ${BRAND.name}. What would you like to explore?`,
    locations,
    faqLinks: enrichedFaqs,
    alerts: enrichedAlerts,
    bookingSuggestions,
    sources,
    provider,
    model,
    uiHints,
  };
}

/** SSE response: generate once, return the complete reply and metadata without simulated typing delay. */
export async function streamTourismReply(
  messages: ChatTurn[],
  opts: {
    sessionId?: string;
    authHeader?: string;
    onToken: (token: string) => void;
    onDone: (result: ChatResult) => void;
  },
): Promise<void> {
  const result = await generateTourismReply(messages, {
    sessionId: opts.sessionId,
    authHeader: opts.authHeader,
  });
  opts.onToken(result.content);
  opts.onDone(result);
}
