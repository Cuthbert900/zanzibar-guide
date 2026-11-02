import { readState, writeState } from "./database";

export type MemoryEventType =
  | "itinerary_generated"
  | "itinerary_accepted"
  | "itinerary_rejected"
  | "preference"
  | "policy_asked"
  | "story_viewed"
  | "session_note";

export interface MemoryEvent {
  id: string;
  sessionId: string;
  type: MemoryEventType;
  summary: string;
  meta?: Record<string, unknown>;
  at: string;
}

export interface TravelerMemory {
  sessionId: string;
  interests: string[];
  budgetMax?: number;
  days?: number;
  travelStyle?: string;
  dietary?: string[];
  notes: string[];
  events: MemoryEvent[];
  updatedAt: string;
}

type Store = { memories: Record<string, TravelerMemory> };
let store: Store = { memories: {} };

export async function initializeTravelerMemoryStore(): Promise<void> {
  store = await readState("traveler-memory", { memories: {} });
}

export function getMemory(sessionId: string): TravelerMemory {
  if (!store.memories[sessionId]) {
    store.memories[sessionId] = {
      sessionId,
      interests: [],
      notes: [],
      events: [],
      updatedAt: new Date().toISOString(),
    };
  }
  return store.memories[sessionId];
}

export async function patchMemory(
  sessionId: string,
  patch: Partial<Omit<TravelerMemory, "sessionId" | "events" | "updatedAt">> & {
    appendNote?: string;
    event?: Omit<MemoryEvent, "id" | "sessionId" | "at">;
  },
): Promise<TravelerMemory> {
  const current = getMemory(sessionId);
  const { appendNote, event, ...fields } = patch;
  const next: TravelerMemory = {
    ...current,
    ...fields,
    sessionId,
    interests: fields.interests ?? current.interests,
    notes: appendNote ? [...current.notes, appendNote].slice(-20) : current.notes,
    events: current.events,
    updatedAt: new Date().toISOString(),
  };
  if (event) {
    next.events = [
      {
        id: `mem_${Date.now().toString(36)}`,
        sessionId,
        at: new Date().toISOString(),
        ...event,
      },
      ...current.events,
    ].slice(0, 50);
  }
  store.memories[sessionId] = next;
  await writeState("traveler-memory", store);
  return next;
}

export function formatMemoryForPrompt(sessionId: string): string {
  const m = getMemory(sessionId);
  const lines: string[] = [];
  if (m.interests.length) lines.push(`interests=${m.interests.join(",")}`);
  if (m.budgetMax != null) lines.push(`budgetMax=${m.budgetMax}`);
  if (m.days != null) lines.push(`preferredDays=${m.days}`);
  if (m.travelStyle) lines.push(`travelStyle=${m.travelStyle}`);
  if (m.dietary?.length) lines.push(`dietary=${m.dietary.join(",")}`);
  if (m.notes.length) lines.push(`notes=${m.notes.slice(0, 5).join(" | ")}`);
  const recent = m.events.slice(0, 5).map((e) => `${e.type}:${e.summary}`).join("; ");
  if (recent) lines.push(`recentEvents=${recent}`);
  return lines.join("\n");
}
