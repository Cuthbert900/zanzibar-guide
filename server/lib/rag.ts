import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import type { CitationSource } from "../../shared/sources";
import { APP_ROOT, DATA_DIR } from "./paths";
import { readState, writeState } from "./database";

const BROCHURES_DIR = path.join(DATA_DIR, "brochures");

export interface RagChunk {
  id: string;
  docId: string;
  docTitle: string;
  page?: number;
  source?: "seed" | "upload" | "tourism-data";
  text: string;
}

export interface RagDoc {
  id: string;
  title: string;
  filename: string;
  uploadedAt: string;
  chunkCount: number;
  source?: "seed" | "upload" | "tourism-data";
  checksum?: string;
}

type IndexFile = { docs: RagDoc[]; chunks: RagChunk[] };

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BROCHURES_DIR)) fs.mkdirSync(BROCHURES_DIR, { recursive: true });
}

async function ensure() {
  ensureDirs();
  index = await readState("rag-index", seedBrochure());
}

let index: IndexFile | undefined;

export async function initializeRagStore(): Promise<void> {
  await ensure();
  await importTourismKnowledge();
}

function read(): IndexFile {
  if (!index) throw new Error("RAG store has not been initialized");
  return index;
}

async function write(data: IndexFile): Promise<void> {
  await writeState("rag-index", data);
  index = data;
}

function chunkText(
  text: string,
  docId: string,
  docTitle: string,
  includePage = true,
  source: NonNullable<RagChunk["source"]> = "upload",
): RagChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const pages = normalized.split(/\n{3,}|\f/).map((p) => p.trim()).filter(Boolean);
  const sourcePages = pages.length ? pages : [normalized];
  const chunks: RagChunk[] = [];
  sourcePages.forEach((pageText, pageIdx) => {
    for (let i = 0; i < pageText.length; i += 700) {
      const part = pageText.slice(i, i + 700).trim();
      if (!part) continue;
      chunks.push({
        id: `chk_${docId}_${pageIdx}_${Math.floor(i / 700)}`,
        docId,
        docTitle,
        ...(includePage ? { page: pageIdx + 1 } : {}),
        source,
        text: part,
      });
    }
  });
  return chunks;
}

function seedBrochure(): IndexFile {
  const title = "Zanzibar Tourism Board Visitor Brochure (demo)";
  const body = `Welcome to Zanzibar (Unguja).

Page focus: Stone Town
Explore carved doors, the House of Wonders area, Old Fort, and Forodhani night market after sunset. Dress modestly in town. Many museums open roughly 09:00–17:00.

Beaches & ocean
Nungwi and Kendwa on the north are popular for swimming. Paje on the east coast is a kitesurf hub — check tides before swimming. Prison Island (Changuu) and Mnemba Atoll are common boat day trips; book licensed operators.

Spice & nature
Kizimbani spice tours introduce cloves, cinnamon, and nutmeg. Jozani Forest is home to red colobus monkeys — arrive early and follow guide instructions.

Accommodation tips
Stone Town boutique hotels suit culture-focused stays. North- and east-coast resorts fit beach holidays. Confirm transfers from ZNZ airport and whether breakfast is included.

Safety & visas
Most visitors need a Tanzania visa (e-visa or on arrival). Malaria precautions apply. Drink bottled water when unsure. Use reef-safe habits — do not stand on coral.

Business & permits
Commercial guiding and boat tours require tourism authority permits and proof of insurance.`;

  const id = "doc_seed_brochure";
  const filename = "visitor-brochure.txt";
  const brochurePath = path.join(BROCHURES_DIR, filename);
  if (!fs.existsSync(brochurePath)) fs.writeFileSync(brochurePath, body);
  const chunks = chunkText(body, id, title, true, "seed");
  return {
    docs: [
      {
        id,
        title,
        filename,
        uploadedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        source: "seed",
      },
    ],
    chunks,
  };
}

async function importTourismKnowledge(): Promise<void> {
  const sourceDir = process.env.TOURISM_KNOWLEDGE_DIR || path.join(APP_ROOT, "Tourism Data", "Tourism MD Files");
  if (!fs.existsSync(sourceDir)) {
    console.warn(`[rag] tourism knowledge folder not found: ${sourceDir}`);
    return;
  }

  const files = fs.readdirSync(sourceDir).filter((file) => file.toLowerCase().endsWith(".md")).sort();
  if (!files.length) return;

  const store = read();
  const seenChecksums = new Set<string>();
  const activeIds = new Set<string>();
  let changed = false;

  for (const filename of files) {
    const filePath = path.join(sourceDir, filename);
    const text = fs.readFileSync(filePath, "utf8");
    if (!text.trim()) continue;
    const checksum = createHash("sha256").update(text).digest("hex");
    if (seenChecksums.has(checksum)) continue;
    seenChecksums.add(checksum);

    const normalizedFilename = filename.replace(/\s+\(\d+\)(?=\.md$)/i, "");
    const title = path.basename(normalizedFilename, path.extname(normalizedFilename));
    const id = `doc_tourism_${checksum.slice(0, 16)}`;
    activeIds.add(id);
    const current = store.docs.find((doc) => doc.id === id);
    if (current?.checksum === checksum) continue;

    const chunks = chunkText(text, id, title, false, "tourism-data");
    store.docs = store.docs.filter((doc) => doc.id !== id);
    store.docs.unshift({
      id,
      title,
      filename: normalizedFilename,
      uploadedAt: fs.statSync(filePath).mtime.toISOString(),
      chunkCount: chunks.length,
      source: "tourism-data",
      checksum,
    });
    store.chunks = [...chunks, ...store.chunks.filter((chunk) => chunk.docId !== id)];
    changed = true;
  }

  const staleIds = store.docs.filter((doc) => doc.source === "tourism-data" && !activeIds.has(doc.id)).map((doc) => doc.id);
  if (staleIds.length) {
    const stale = new Set(staleIds);
    store.docs = store.docs.filter((doc) => !stale.has(doc.id));
    store.chunks = store.chunks.filter((chunk) => !stale.has(chunk.docId));
    changed = true;
  }

  if (changed) {
    store.chunks = store.chunks.slice(0, 10_000);
    await write(store);
  }
  console.info(`[rag] indexed ${activeIds.size} tourism knowledge documents`);
}

/** Minimal PDF text extraction for text-based PDFs (demo; not a full parser). */
export function extractPdfText(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const matches = Array.from(raw.matchAll(/\((?:\\.|[^\\)]){3,}\)/g)).map((m) =>
    m[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\([()\\])/g, "$1"),
  );
  const joined = matches.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length > 80) return joined;
  // Fallback: stream tokens
  const streams = Array.from(raw.matchAll(/BT([\s\S]*?)ET/g)).map((m) => m[1]);
  const fromStreams = streams
    .flatMap((s) => Array.from(s.matchAll(/\((?:\\.|[^\\)])*\)/g)).map((x) => x[0].slice(1, -1)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return fromStreams || "PDF uploaded — limited text extracted (image-heavy PDF). Add a .txt brochure for richer RAG.";
}

export async function ingestBrochure(opts: {
  title: string;
  filename: string;
  contentBase64: string;
  mime?: string;
}): Promise<RagDoc> {
  ensureDirs();
  const buf = Buffer.from(opts.contentBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  let text = "";
  const lower = opts.filename.toLowerCase();
  if (lower.endsWith(".pdf") || opts.mime?.includes("pdf")) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const result = await parser.getText();
      text = (result?.text as string) || extractPdfText(buf);
      await parser.destroy?.();
    } catch {
      text = extractPdfText(buf);
    }
  } else {
    text = buf.toString("utf-8");
  }
  if (!text.trim()) throw new Error("No text extracted from brochure");

  const store = read();
  const id = `doc_${randomUUID().slice(0, 8)}`;
  const safeName = opts.filename.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  fs.writeFileSync(path.join(BROCHURES_DIR, `${id}_${safeName}`), buf);
  const chunks = chunkText(text, id, opts.title || opts.filename, true, "upload");
  const doc: RagDoc = {
    id,
    title: opts.title || opts.filename,
    filename: safeName,
    uploadedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    source: "upload",
  };
  store.docs.unshift(doc);
  store.chunks = [...chunks, ...store.chunks].slice(0, 10_000);
  await write(store);
  return doc;
}

export function listBrochures(): RagDoc[] {
  return read().docs;
}

export function retrieveChunks(query: string, limit = 4): { chunks: RagChunk[]; sources: CitationSource[] } {
  const q = query.toLowerCase();

  // Try vector search (Qdrant) first if available
  try {
    // dynamic require to avoid hard dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchVectors } = require("./vector") as typeof import("./vector");
    // perform synchronous-ish call via spawn (but we must keep function sync) -> we'll do a best-effort sync by reading via deasync is not available
    // Instead, fallback to returning text-based search here and provide an async search endpoint elsewhere.
  } catch {
    // ignore — fall back to text search below
  }

  const terms = q.split(/\W+/).filter((t) => t.length > 2);
  const scored = read().chunks.map((c) => {
    const hay = c.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
    }
    if (/falls|victoria|safari|visa|permit|hotel|park|gate/i.test(q) && hay.match(/falls|safari|visa|permit|hotel|park|gate/i)) {
      score += 0.5;
    }
    return { c, score };
  });
  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const perDocument = new Map<string, number>();
  const top = ranked
    .filter(({ c }) => {
      const count = perDocument.get(c.docId) || 0;
      if (count >= 2) return false;
      perDocument.set(c.docId, count + 1);
      return true;
    })
    .slice(0, limit)
    .map((s) => s.c);

  // Always return seed snippets if nothing matched
  const chunks = top.length ? top : read().chunks.slice(0, Math.min(2, limit));
  const sourceChunks = Array.from(new Map(chunks.map((chunk) => [chunk.docId, chunk])).values());
  const sources: CitationSource[] = sourceChunks.map((c) => ({
    id: c.docId,
    kind: c.source === "tourism-data" ? "tourism-data" : "brochure",
    title: c.docTitle,
    detail: c.text.slice(0, 120) + (c.text.length > 120 ? "…" : ""),
    ...(c.page ? { page: c.page } : {}),
  }));
  return { chunks, sources };
}

export function formatRagContext(query: string): string {
  const { chunks } = retrieveChunks(query, 3);
  if (!chunks.length) return "";
  return (
    "Tourism knowledge excerpts (name the source when using):\n" +
    chunks.map((c) => `[${c.docTitle}${c.page ? ` p.${c.page}` : ""}] ${c.text}`).join("\n---\n")
  );
}
