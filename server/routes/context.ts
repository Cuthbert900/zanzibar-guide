import { Router } from "express";
import type { InterestTag } from "../../shared/catalog";
import { getContext, putContext } from "../lib/store";

export const contextRouter = Router();

contextRouter.get("/:sessionId", (req, res) => {
  res.json({ data: getContext(req.params.sessionId) });
});

contextRouter.put("/:sessionId", async (req, res) => {
  const body = req.body as {
    language?: string;
    budgetMax?: number;
    interests?: InterestTag[];
    partySize?: number;
    historySummary?: string;
  };

  const patch: Parameters<typeof putContext>[1] = {};
  if (typeof body.language === "string") patch.language = body.language;
  if (typeof body.budgetMax === "number") patch.budgetMax = body.budgetMax;
  if (Array.isArray(body.interests)) patch.interests = body.interests;
  if (typeof body.partySize === "number") patch.partySize = body.partySize;
  if (typeof body.historySummary === "string") patch.historySummary = body.historySummary.slice(0, 2000);

  res.json({ data: await putContext(req.params.sessionId, patch) });
});
