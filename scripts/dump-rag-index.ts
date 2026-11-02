/**
 * scripts/dump-rag-index.ts
 *
 * Connect to Mongo and print a summary of the RAG index state (docs and chunks).
 * Usage: pnpm exec tsx scripts/dump-rag-index.ts
 */
async function main() {
  try {
    const { connectDatabase, closeDatabase } = await import("../server/lib/database");
    const { readState } = await import("../server/lib/database");
    await connectDatabase();
    const idx = await readState("rag-index", { docs: [], chunks: [] });
    console.log("RAG index summary:");
    console.log("  docs:", (idx.docs || []).length);
    console.log("  chunks:", (idx.chunks || []).length);
    if (idx.docs && idx.docs.length) {
      console.log("  sample doc ids:", idx.docs.slice(0, 5).map((d: any) => d.id));
    }
    if (idx.chunks && idx.chunks.length) {
      console.log("  sample chunk ids:", idx.chunks.slice(0, 5).map((c: any) => c.id));
    }
    await closeDatabase();
  } catch (err) {
    console.error("Failed to read rag-index:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
