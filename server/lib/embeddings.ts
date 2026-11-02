import { createHash } from "crypto";
import { readState, writeState } from "./database";

/**
 * Minimal local embedding store and worker (demo / scaffold).
 * - computeEmbedding(text): deterministic pseudo-embedding using SHA256 bytes
 * - indexDoc / indexAllDocs: compute embeddings for chunks and store in 'rag-embeds' state
 * - getEmbedsForDoc: return embeddings for a doc
 * - searchEmbeddings: approximate nearest by cosine over stored vectors
 *
 * This is intentionally simple and local — swap to a real vector DB (Qdrant/Pinecone/etc.)
 * when you move to production.
 */

type EmbRecord = {
  chunkId: string;
  docId: string;
  docTitle?: string;
  textSnippet?: string;
  vec: number[]; // float32-like numbers
};

const EMB_STATE = "rag-embeds";
const RAG_STATE = "rag-index";
const DIM = 32;

export function computeEmbedding(text: string, dim = DIM): number[] {
  const hash = createHash("sha256").update(text).digest();
  const out: number[] = [];
  for (let i = 0; i < dim; i++) {
    const byte = hash[i % hash.length];
    // Normalize to -1..1
    out.push((byte / 255) * 2 - 1);
  }
  return out;
}

async function getRagIndex(): Promise<{ docs: any[]; chunks: any[] }> {
  const idx = await readState(RAG_STATE, { docs: [], chunks: [] });
  return idx as { docs: any[]; chunks: any[] };
}

async function getEmbState(): Promise<Record<string, EmbRecord>> {
  const state = (await readState(EMB_STATE, {} as Record<string, EmbRecord>)) as Record<string, EmbRecord>;
  return state || {};
}

async function saveEmbState(state: Record<string, EmbRecord>): Promise<void> {
  await writeState(EMB_STATE, state);
}

export async function indexDoc(docId: string): Promise<number> {
  const idx = await getRagIndex();
  const chunks = idx.chunks.filter((c: any) => c.docId === docId);
  if (!chunks.length) return 0;
  const emb = await getEmbState();
  for (const c of chunks) {
    const vec = computeEmbedding(c.text || c.docTitle || c.docId);
    emb[c.id] = {
      chunkId: c.id,
      docId: c.docId,
      docTitle: c.docTitle,
      textSnippet: (c.text || "").slice(0, 200),
      vec,
    };
  }
  await saveEmbState(emb);
  return chunks.length;
}

export async function indexAllDocs(): Promise<number> {
  const idx = await getRagIndex();
  const emb = await getEmbState();
  let added = 0;
  for (const c of idx.chunks) {
    if (!emb[c.id]) {
      const vec = computeEmbedding(c.text || c.docTitle || c.docId);
      emb[c.id] = {
        chunkId: c.id,
        docId: c.docId,
        docTitle: c.docTitle,
        textSnippet: (c.text || "").slice(0, 200),
        vec,
      };
      added++;
    }
  }
  await saveEmbState(emb);
  return added;
}

export async function getEmbedsForDoc(docId: string): Promise<EmbRecord[]> {
  const emb = await getEmbState();
  return Object.values(emb).filter((e) => e.docId === docId);
}

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s) || 1;
}

export async function searchEmbeddings(query: string, k = 5): Promise<Array<{ score: number; record: EmbRecord }>> {
  const qv = computeEmbedding(query);
  const emb = await getEmbState();
  const list = Object.values(emb).map((r) => {
    const score = dot(qv, r.vec) / (norm(qv) * norm(r.vec));
    return { score, record: r };
  });
  list.sort((a, b) => b.score - a.score);
  return list.slice(0, k);
}

export async function getAllEmbeddings(): Promise<EmbRecord[]> {
  const emb = await getEmbState();
  return Object.values(emb);
}
