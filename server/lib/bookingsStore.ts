import type { BookingRecord } from "./store";
import { readState, writeState } from "./database";

let cache: BookingRecord[] = [];

export async function initializeBookingsStore(): Promise<void> {
  cache = (await readState("bookings", { bookings: [] })).bookings || [];
}

export async function reloadBookingsCache(): Promise<BookingRecord[]> {
  cache = (await readState("bookings", { bookings: [] })).bookings || [];
  return cache;
}

export async function saveBookingRecord(booking: BookingRecord): Promise<BookingRecord> {
  const idx = cache.findIndex((b) => b.id === booking.id);
  if (idx >= 0) cache[idx] = booking;
  else cache.unshift(booking);
  cache = cache.slice(0, 500);
  await writeState("bookings", { bookings: cache });
  return booking;
}

export function getBookingRecord(id: string): BookingRecord | undefined {
  return cache.find((b) => b.id === id);
}

export function listBookingRecords(): BookingRecord[] {
  return [...cache];
}

export function getBookingsByIds(ids: string[]): BookingRecord[] {
  const set = new Set(ids);
  return cache.filter((b) => set.has(b.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBookingByConfirmationCode(code: string): BookingRecord | undefined {
  const normalized = code.trim().toUpperCase();
  return cache.find((b) => b.confirmationCode?.toUpperCase() === normalized);
}

export function findBookingByEmailAndCode(email: string, confirmationCode: string): BookingRecord | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = confirmationCode.trim().toUpperCase();
  return cache.find(
    (b) => b.email.trim().toLowerCase() === normalizedEmail && b.confirmationCode?.toUpperCase() === normalizedCode,
  );
}

export type PublicBooking = Omit<BookingRecord, "paymentToken" | "paymentRef">;

export function toPublicBooking(booking: BookingRecord): PublicBooking {
  const { paymentToken: _t, paymentRef: _r, ...rest } = booking;
  return rest;
}
