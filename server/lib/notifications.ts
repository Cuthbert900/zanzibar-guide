import { randomUUID } from "crypto";
import { readState, writeState } from "./database";

export interface AppNotification {
  id: string;
  channel: "push" | "whatsapp" | "inapp";
  to: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  status: "queued" | "sent" | "failed";
}

let notifications: AppNotification[] = [];

export async function initializeNotificationsStore(): Promise<void> {
  notifications = await readState("notifications", []);
}

export function listNotifications(): AppNotification[] {
  return notifications;
}

export async function pushNotification(input: Omit<AppNotification, "id" | "createdAt" | "status"> & { status?: AppNotification["status"] }): Promise<AppNotification> {
  const row: AppNotification = {
    id: `ntf_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: input.status || "sent",
    channel: input.channel,
    to: input.to,
    title: input.title,
    body: input.body,
    meta: input.meta,
  };
  notifications = [row, ...notifications].slice(0, 200);
  await writeState("notifications", notifications);
  console.log(`[notify:${row.channel}] → ${row.to}: ${row.title}`);
  return row;
}
