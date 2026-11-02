import type { InterestTag } from "../../shared/catalog";

export interface UserContext {
  sessionId: string;
  language: string;
  budgetMax?: number;
  interests: InterestTag[];
  partySize: number;
  historySummary?: string;
  updatedAt: string;
}

export interface BookingRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemType: "hotel" | "attraction" | "tour";
  priceLabel: string;
  amountUsd: number;
  guestName: string;
  email: string;
  phone: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  status: "pending_payment" | "paid" | "cancelled";
  paymentToken?: string;
  confirmationCode?: string;
  createdAt: string;
  /** Never store PAN — only tokenized references */
  paymentRef?: string;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  channel: "web" | "widget" | "whatsapp";
  intent?: string;
  meta?: Record<string, unknown>;
  at: string;
}

import {
  getBookingRecord,
  listBookingRecords,
  saveBookingRecord,
} from "./bookingsStore";
import { readState, writeState } from "./database";

const contexts = new Map<string, UserContext>();
const analytics: AnalyticsEvent[] = [];

export async function initializeCoreStores(): Promise<void> {
  const contextState = await readState("contexts", { contexts: {} as Record<string, UserContext> });
  contexts.clear();
  for (const [id, context] of Object.entries(contextState.contexts)) contexts.set(id, context);
  const analyticsState = await readState("analytics", { events: [] as AnalyticsEvent[] });
  analytics.splice(0, analytics.length, ...(analyticsState.events || []).slice(-2000));
}

export function getContext(sessionId: string): UserContext {
  const existing = contexts.get(sessionId);
  if (existing) return existing;
  const fresh: UserContext = {
    sessionId,
    language: "en",
    interests: [],
    partySize: 1,
    updatedAt: new Date().toISOString(),
  };
  contexts.set(sessionId, fresh);
  return fresh;
}

export async function putContext(sessionId: string, patch: Partial<UserContext>): Promise<UserContext> {
  const current = getContext(sessionId);
  const next: UserContext = {
    ...current,
    ...patch,
    sessionId,
    interests: patch.interests ?? current.interests,
    updatedAt: new Date().toISOString(),
  };
  contexts.set(sessionId, next);
  await writeState("contexts", { contexts: Object.fromEntries(contexts) });
  return next;
}

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  return saveBookingRecord(booking);
}

export function getBooking(id: string): BookingRecord | undefined {
  return getBookingRecord(id);
}

export function listBookings(): BookingRecord[] {
  return listBookingRecords();
}

export async function trackEvent(event: Omit<AnalyticsEvent, "id" | "at"> & { at?: string }): Promise<AnalyticsEvent> {
  const row: AnalyticsEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: event.at ?? new Date().toISOString(),
    type: event.type,
    channel: event.channel,
    intent: event.intent,
    meta: event.meta,
  };
  analytics.push(row);
  if (analytics.length > 2000) analytics.shift();
  await writeState("analytics", { events: analytics });
  return row;
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return analytics;
}

export function analyticsSummary() {
  const byType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const intents: Record<string, number> = {};
  for (const e of analytics) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    byChannel[e.channel] = (byChannel[e.channel] || 0) + 1;
    if (e.intent) intents[e.intent] = (intents[e.intent] || 0) + 1;
  }
  const topIntents = Object.entries(intents)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([intent, count]) => ({ intent, count }));

  const allBookings = listBookingRecords();
  const bookingStats = {
    total: allBookings.length,
    paid: allBookings.filter((b) => b.status === "paid").length,
    pending: allBookings.filter((b) => b.status === "pending_payment").length,
  };

  return {
    totalEvents: analytics.length,
    byType,
    byChannel,
    topIntents,
    bookings: bookingStats,
  };
}
