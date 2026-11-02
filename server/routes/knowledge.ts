import { Router } from "express";
import { getFaq, searchFaq } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const knowledgeRouter = Router();

knowledgeRouter.get("/faq", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  await trackEvent({ type: "faq_search", channel: "web", intent: "knowledge", meta: { q } });
  res.json({
    source: "self-service-knowledge-base",
    count: searchFaq(q).length,
    data: searchFaq(q),
  });
});

knowledgeRouter.get("/faq/:id", async (req, res) => {
  const article = getFaq(req.params.id);
  if (!article) {
    res.status(404).json({ error: "FAQ not found" });
    return;
  }
  await trackEvent({ type: "faq_view", channel: "web", intent: "knowledge", meta: { id: article.id } });
  res.json({ data: article });
});
