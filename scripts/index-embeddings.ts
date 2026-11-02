/**
 * scripts/index-embeddings.ts
 *
 * Run the local embedding indexer (indexAllDocs) to compute embeddings for all RAG chunks
 * and store them in the app state (Mongo). After running, you can run the migrate-to-qdrant script.
 *
 * Usage:
 *   pnpm exec tsx scripts/index-embeddings.ts
 */

async function main() {
  // Ensure Mongo is connected because embedding state lives in app_state (Mongo)
  const { connectDatabase, closeDatabase } = await import("../server/lib/database");
  try {
    await connectDatabase();
  } catch (err) {
    console.error("[index] failed to connect to database:", err);
    process.exit(1);
  }

  const mod = await import("../server/lib/embeddings");
  const { indexAllDocs } = mod;
  try {
    const added = await indexAllDocs();
    console.log(`[index] added ${added} embeddings to local store`);
  } catch (err) {
    console.error("[index] failed:", err);
    await closeDatabase().catch(() => {});
    process.exit(1);
  } finally {
    await closeDatabase().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
