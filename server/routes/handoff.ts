import { Router } from "express";
import {
  addMessage,
  claimTicket,
  createTicket,
  getOpenBySession,
  getTicket,
  listTickets,
  resolveTicket,
} from "../lib/handoff";

export const handoffRouter = Router();

handoffRouter.post("/", async (req, res) => {
  const { sessionId, travellerName, transcript } = req.body as {
    sessionId?: string;
    travellerName?: string;
    transcript?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }
  const ticket = await createTicket({ sessionId, travellerName, transcript });
  res.status(201).json({ data: ticket });
});

handoffRouter.get("/queue", (_req, res) => {
  res.json({ data: listTickets() });
});

handoffRouter.get("/session/:sessionId", (req, res) => {
  const ticket = getOpenBySession(req.params.sessionId);
  res.json({ data: ticket || null });
});

handoffRouter.get("/:id", (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ data: ticket });
});

handoffRouter.post("/:id/claim", async (req, res) => {
  const agentName = (req.body as { agentName?: string }).agentName || "Tourism Agent";
  const ticket = await claimTicket(req.params.id, agentName);
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ data: ticket });
});

handoffRouter.post("/:id/message", async (req, res) => {
  const { role, content } = req.body as { role?: "traveller" | "agent"; content?: string };
  if (!role || !content?.trim()) {
    res.status(400).json({ error: "role and content required" });
    return;
  }
  const ticket = await addMessage(req.params.id, role, content.trim());
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ data: ticket });
});

handoffRouter.post("/:id/resolve", async (req, res) => {
  const ticket = await resolveTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ data: ticket });
});
