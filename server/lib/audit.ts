import { randomUUID } from "crypto";
import { readState, writeState } from "./database";

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  detail?: string;
}

let entries: AuditEntry[] = [];

export async function initializeAuditStore(): Promise<void> {
  entries = (await readState("audit", { entries: [] })).entries;
}

export async function appendAudit(entry: Omit<AuditEntry, "id" | "at">): Promise<void> {
  entries.unshift({
    id: `aud_${randomUUID().slice(0, 8)}`,
    at: new Date().toISOString(),
    ...entry,
  });
  entries = entries.slice(0, 200);
  await writeState("audit", { entries });
}

export function listAudit(limit = 50): AuditEntry[] {
  return entries.slice(0, limit);
}
