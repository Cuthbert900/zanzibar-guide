import { randomUUID } from "crypto";
import { readState, writeState } from "./database";

export type HandoffStatus = "queued" | "assigned" | "resolved";

export interface HandoffMessage {
  id: string;
  role: "traveller" | "agent" | "system";
  content: string;
  at: string;
}

export interface HandoffTicket {
  id: string;
  sessionId: string;
  travellerName: string;
  status: HandoffStatus;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
  transcript: HandoffMessage[];
}

type Store = { tickets: HandoffTicket[] };

let tickets: HandoffTicket[] = [];

export async function initializeHandoffStore(): Promise<void> {
  tickets = (await readState("handoff", { tickets: [] })).tickets;
}

async function persistTickets(): Promise<void> {
  await writeState("handoff", { tickets });
}

export async function createTicket(opts: {
  sessionId: string;
  travellerName?: string;
  transcript?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<HandoffTicket> {
  const existing = tickets.find(
    (t) => t.sessionId === opts.sessionId && (t.status === "queued" || t.status === "assigned"),
  );
  if (existing) return existing;

  const transcript: HandoffMessage[] = (opts.transcript || []).slice(-20).map((m) => ({
    id: `hm_${randomUUID().slice(0, 6)}`,
    role: m.role === "user" ? "traveller" : "agent",
    content: m.content,
    at: new Date().toISOString(),
  }));
  transcript.push({
    id: `hm_${randomUUID().slice(0, 6)}`,
    role: "system",
    content: "Traveller requested human handoff. Waiting for an agent…",
    at: new Date().toISOString(),
  });

  const ticket: HandoffTicket = {
    id: `hd_${randomUUID().slice(0, 8)}`,
    sessionId: opts.sessionId,
    travellerName: opts.travellerName || "Traveller",
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transcript,
  };
  tickets.unshift(ticket);
  await persistTickets();
  return ticket;
}

export function listTickets(status?: HandoffStatus): HandoffTicket[] {
  return status ? tickets.filter((t) => t.status === status) : tickets;
}

export function getTicket(id: string): HandoffTicket | undefined {
  return tickets.find((t) => t.id === id);
}

export function getOpenBySession(sessionId: string): HandoffTicket | undefined {
  return tickets.find(
    (t) => t.sessionId === sessionId && (t.status === "queued" || t.status === "assigned"),
  );
}

export async function claimTicket(id: string, agentName: string): Promise<HandoffTicket | null> {
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const t = tickets[idx];
  t.status = "assigned";
  t.agentName = agentName || "Agent";
  t.updatedAt = new Date().toISOString();
  t.transcript.push({
    id: `hm_${randomUUID().slice(0, 6)}`,
    role: "system",
    content: `${t.agentName} joined the conversation.`,
    at: new Date().toISOString(),
  });
  await persistTickets();
  return t;
}

export async function addMessage(id: string, role: "traveller" | "agent", content: string): Promise<HandoffTicket | null> {
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const t = tickets[idx];
  t.transcript.push({
    id: `hm_${randomUUID().slice(0, 6)}`,
    role,
    content,
    at: new Date().toISOString(),
  });
  t.updatedAt = new Date().toISOString();
  await persistTickets();
  return t;
}

export async function resolveTicket(id: string): Promise<HandoffTicket | null> {
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const t = tickets[idx];
  t.status = "resolved";
  t.updatedAt = new Date().toISOString();
  t.transcript.push({
    id: `hm_${randomUUID().slice(0, 6)}`,
    role: "system",
    content: "Ticket resolved. Returning traveller to AI assistant.",
    at: new Date().toISOString(),
  });
  await persistTickets();
  return t;
}
