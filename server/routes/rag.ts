import { Router } from "express";
import { formatRagContext, ingestBrochure, listBrochures, retrieveChunks } from "../lib/rag";

export const ragRouter = Router();

ragRouter.get("/docs", (_req, res) => {
  res.json({ data: listBrochures() });
});

ragRouter.post("/upload", async (req, res) => {
  try {
    const { title, filename, contentBase64, mime } = req.body as {
      title?: string;
      filename?: string;
      contentBase64?: string;
      mime?: string;
    };
    if (!contentBase64 || !filename) {
      res.status(400).json({ error: "filename and contentBase64 required" });
      return;
    }
    const doc = await ingestBrochure({
      title: title || filename,
      filename,
      contentBase64,
      mime,
    });
    res.status(201).json({ data: doc });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

ragRouter.get("/search", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const { chunks, sources } = retrieveChunks(q || "falls safari", 5);
  res.json({ data: { chunks, sources, contextPreview: formatRagContext(q || "falls") } });
});

ragRouter.post("/index", async (req, res) => {
  try {
    const { docId } = req.body as { docId?: string };
    if (!docId) {
      res.status(400).json({ error: "docId is required" });
      return;
    }
    const { indexDoc } = await import("../lib/embeddings");
    const count = await indexDoc(docId);
    res.json({ ok: true, indexedChunks: count });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Indexing failed" });
  }
});

ragRouter.post("/indexAll", async (_req, res) => {
  try {
    const { indexAllDocs } = await import("../lib/embeddings");
    const added = await indexAllDocs();
    res.json({ ok: true, added });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Indexing failed" });
  }
});

ragRouter.get("/embeds/:docId", async (req, res) => {
  try {
    const docId = req.params.docId;
    if (!docId) {
      res.status(400).json({ error: "docId required" });
      return;
    }
    const { getEmbedsForDoc } = await import("../lib/embeddings");
    const records = await getEmbedsForDoc(docId);
    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch embeddings" });
  }
});
