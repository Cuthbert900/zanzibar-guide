/**
 * server/lib/ragVector.ts
 *
 * Async vector-backed retrieval helper using Qdrant.
 *
 * Provides vectorRetrieve(query, limit) -> { chunks, sources }
 * Falls back to returning an empty array when vector DB is unavailable.
 */

import { readState } from "./database";
import type { RagChunk } from "./rag";
import type { CitationSource } from "../../shared/sources";
import { computeEmbedding } from "./embeddings";
import { searchVectors } from "./vector";

export async function vectorRetrieve(query: string, limit = 5): Promise<{ chunks: RagChunk[]; sources: CitationSource[] }> {
  try {
    const collection = process.env.QDRANT_COLLECTION || "zanzibar_rag";
    const vec = computeEmbedding(query);

    const res = await searchVectors(collection, vec, limit);
    // Normalize result array
    const candidates = res?.result ?? res?.result?.[0] ?? res?.data?.result ?? res?.result ?? res?.hits ?? res;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { chunks: [], sources: [] };
    }

    // Load RAG index to map original chunk ids to chunk objects
    const idx = await readState("rag-index", { docs: [], chunks: [] });
    const chunkMap = new Map<string, RagChunk>(idx.chunks.map((c: RagChunk) => [c.id, c]));

    const outChunks: RagChunk[] = [];
    const sources: CitationSource[] = [];

    for (const hit of candidates) {
      const payload = hit.payload || hit.value || {};
      const originalId = payload.originalId || payload.original_id || payload.chunkId || payload.id || hit.id;
      const score = hit.score ?? hit._score ?? hit.score ?? 0;

      const chunk = chunkMap.get(originalId);
      if (chunk) {
        outChunks.push(chunk);
        sources.push({
          id: chunk.docId,
          kind: chunk.source === "tourism-data" ? "tourism-data" : "brochure",
          title: chunk.docTitle,
          detail: (chunk.text || "").slice(0, 140),
          confidence: score > 0.7 ? "high" : score > 0.4 ? "medium" : "low",
        } as CitationSource);
      } else if (typeof originalId === "string") {
        // If we don't have the chunk locally, create a minimal source entry
        sources.push({
          id: originalId,
          kind: "brochure",
          title: String(payload.docTitle || originalId),
          detail: (String(payload.snippet || "")).slice(0, 140),
          confidence: score > 0.7 ? "high" : score > 0.4 ? "medium" : "low",
        } as CitationSource);
      }
      if (outChunks.length >= limit) break;
    }

    return { chunks: outChunks, sources };
  } catch (err) {
    console.warn("[ragVector] vector retrieval failed, falling back to text search:", err);
    return { chunks: [], sources: [] };
  }
}
