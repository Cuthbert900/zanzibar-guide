const STORAGE_KEY = "travelguide_booking_ids";

export function getGuestBookingIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberGuestBooking(id: string): void {
  const ids = Array.from(new Set([id, ...getGuestBookingIds()])).slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem("travelguide_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PublicBooking {
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
  confirmationCode?: string;
  createdAt: string;
}

export async function fetchMyBookings(): Promise<PublicBooking[]> {
  const ids = getGuestBookingIds();
  const qs = ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  const res = await fetch(`/api/bookings/mine${qs}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load bookings");
  return data.data || [];
}

export async function trackBooking(email: string, confirmationCode: string): Promise<PublicBooking> {
  const res = await fetch("/api/bookings/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, confirmationCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Booking not found");
  return data.data;
}

export async function fetchBookingByCode(code: string): Promise<PublicBooking> {
  const res = await fetch(`/api/bookings/code/${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Booking not found");
  return data.data;
}

export function statusLabel(status: PublicBooking["status"]): string {
  switch (status) {
    case "paid":
      return "Confirmed";
    case "pending_payment":
      return "Awaiting payment";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function statusColor(status: PublicBooking["status"]): string {
  switch (status) {
    case "paid":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "pending_payment":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "cancelled":
      return "text-red-700 bg-red-50 border-red-200";
    default:
      return "text-muted-foreground bg-muted";
  }
}
