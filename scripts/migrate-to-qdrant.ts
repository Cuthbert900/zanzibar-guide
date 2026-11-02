/**
 * scripts/migrate-to-qdrant.ts
 *
 * Migrate local embeddings (server/lib/embeddings) into a Qdrant collection.
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-to-qdrant.ts
 *
 * Environment:
 *   QDRANT_URL (default http://localhost:6333)
 *   QDRANT_COLLECTION (default "zanzibar_rag")
 *   QDRANT_VECTOR_DIM (default 32)
 *   MIGRATE_BATCH_SIZE (default 100)
 */

import { createHash } from "crypto";

async function main() {
  const collection = process.env.QDRANT_COLLECTION || "zanzibar_rag";
  const vectorDim = Number(process.env.QDRANT_VECTOR_DIM || 32);
  const batchSize = Number(process.env.MIGRATE_BATCH_SIZE || 100);

  console.log(`[migrate] collection=${collection} dim=${vectorDim} batch=${batchSize}`);

  // dynamic imports so this script remains runnable even if server deps haven't been installed
  const vectorMod = await import("../server/lib/vector");
  const embedMod = await import("../server/lib/embeddings");

  // ensure collection exists
  try {
    await vectorMod.ensureCollection(collection, vectorDim);
  } catch (err) {
    console.error("[migrate] failed to ensure collection:", err);
    process.exit(1);
  }

  // ensure DB and load all local embeddings (embeddings read from app_state via Mongo)
  const { connectDatabase, closeDatabase } = await import("../server/lib/database");
  try {
    await connectDatabase();
  } catch (err) {
    console.error("[migrate] failed to connect to database:", err);
    process.exit(1);
  }

  let all: Array<{ chunkId: string; docId: string; docTitle?: string; textSnippet?: string; vec: number[] }> = [];
  try {
    all = await embedMod.getAllEmbeddings();
  } catch (err) {
    console.error("[migrate] failed to load embeddings:", err);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }

  console.log(`[migrate] ${all.length} embeddings found locally`);

  let uploaded = 0;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize).map((r) => {
      // Qdrant requires UUID or unsigned integer for point IDs.
      const hash = createHash("md5").update(r.chunkId).digest("hex");
      const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
      return {
        id: uuid,
        vector: r.vec,
        payload: {
          docId: r.docId,
          docTitle: r.docTitle,
          snippet: r.textSnippet,
          originalId: r.chunkId,
        },
      };
    });
    try {
      const res = await vectorMod.upsertVectors(collection, batch);
      uploaded += batch.length;
      console.log(`[migrate] uploaded ${i + 1}-${i + batch.length} (${uploaded}/${all.length})`, res?.status ?? "");
    } catch (err) {
      console.error(`[migrate] failed to upload batch ${i + 1}-${i + batch.length}:`, err);
      // continue with next batch
    }
  }

  console.log(`[migrate] done. uploaded ${uploaded}/${all.length} vectors to collection "${collection}"`);
  try {
    const { closeDatabase } = await import("../server/lib/database");
    await closeDatabase();
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error("[migrate] unexpected error:", err);
  process.exit(1);
});
