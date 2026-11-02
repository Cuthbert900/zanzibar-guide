import { Router } from "express";
import { getById } from "../knowledge/mockCommission";
import { getBooking, saveBooking, trackEvent, type BookingRecord } from "../lib/store";
import {
  findBookingByEmailAndCode,
  getBookingByConfirmationCode,
  getBookingsByIds,
  toPublicBooking,
} from "../lib/bookingsStore";
import { authFromHeader, updateUser } from "../lib/users";
import { learnAfterBooking } from "./profile";
import { awardPoints } from "../lib/engagement";
import { dispatchBookingConfirmation } from "../lib/dispatch";

export const bookingsRouter = Router();

async function attachBookingToUser(authHeader: string | undefined, bookingId: string): Promise<void> {
  const user = authFromHeader(authHeader);
  if (!user) return;
  const ids = Array.from(new Set([bookingId, ...(user.bookingIds || [])])).slice(0, 50);
  await updateUser(user.id, { bookingIds: ids });
}

function parseAmount(priceLabel: string, itemId: string): number {
  const loc = getById(itemId);
  if (loc?.pricePerNight != null) return loc.pricePerNight;
  if (loc?.entryFee != null) return loc.entryFee;
  const m = priceLabel.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function baseUrlFromRequest(req: { get: (name: string) => string | undefined }): string {
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : process.env.APP_BASE_URL || "http://127.0.0.1:3000";
}

/** List bookings for logged-in user and/or guest localStorage ids (?ids=bk_1,bk_2) */
bookingsRouter.get("/mine", (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  const extraIds = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = user
    ? Array.from(new Set([...(user.bookingIds || []), ...extraIds]))
    : extraIds;
  const rows = getBookingsByIds(ids).map(toPublicBooking);
  res.json({ data: rows });
});

/** Track booking by email + confirmation code */
bookingsRouter.post("/track", (req, res) => {
  const { email, confirmationCode } = req.body as { email?: string; confirmationCode?: string };
  if (!email?.trim() || !confirmationCode?.trim()) {
    res.status(400).json({ error: "email and confirmationCode are required" });
    return;
  }
  const booking = findBookingByEmailAndCode(email, confirmationCode);
  if (!booking) {
    res.status(404).json({ error: "No booking found for that email and confirmation code" });
    return;
  }
  res.json({ data: toPublicBooking(booking) });
});

/** Public lookup by confirmation code (for /bookings/TG-XXXX links) */
bookingsRouter.get("/code/:code", (req, res) => {
  const booking = getBookingByConfirmationCode(req.params.code);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json({ data: toPublicBooking(booking) });
});

bookingsRouter.post("/", async (req, res) => {
  const body = req.body as {
    itemId?: string;
    itemName?: string;
    itemType?: "hotel" | "attraction" | "tour";
    priceLabel?: string;
    guestName?: string;
    email?: string;
    phone?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  };

  if (!body.itemId || !body.itemName || !body.guestName || !body.email) {
    res.status(400).json({ error: "itemId, itemName, guestName, and email are required" });
    return;
  }

  const priceLabel = body.priceLabel || getById(body.itemId)?.price || "On request";
  const booking: BookingRecord = {
    id: `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    itemId: body.itemId,
    itemName: body.itemName,
    itemType: body.itemType || "attraction",
    priceLabel,
    amountUsd: parseAmount(priceLabel, body.itemId),
    guestName: body.guestName,
    email: body.email,
    phone: body.phone || "",
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests || 1,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
  };

  await saveBooking(booking);
  await trackEvent({ type: "booking_created", channel: "web", intent: "booking", meta: { id: booking.id } });
  res.status(201).json({
    gateway: "pci-dss-shaped-mock",
    note: "Card PANs are never accepted by this API — pay with a payment token only.",
    data: toPublicBooking(booking),
  });
});

bookingsRouter.post("/:id/pay", async (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const token = (req.body as { paymentToken?: string }).paymentToken;
  if (!token || typeof token !== "string" || !token.startsWith("tok_")) {
    res.status(400).json({
      error: "paymentToken required (format: tok_*) — never send raw card numbers",
    });
    return;
  }

  if (booking.status === "paid") {
    res.json({ data: toPublicBooking(booking), message: "Already paid" });
    return;
  }

  const updated: BookingRecord = {
    ...booking,
    status: "paid",
    paymentRef: `pay_${Date.now().toString(36)}`,
    confirmationCode: `TG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };
  await saveBooking(updated);
  await attachBookingToUser(req.headers.authorization, updated.id);
  const user = authFromHeader(req.headers.authorization);
  if (user) {
    await awardPoints(user.id, 40, "booking");
    await learnAfterBooking(user.id);
  }
  await trackEvent({ type: "booking_paid", channel: "web", intent: "booking", meta: { id: updated.id } });

  const dispatch = await dispatchBookingConfirmation(updated, { baseUrl: baseUrlFromRequest(req) });

  res.json({
    gateway: "pci-dss-shaped-mock",
    message: "Payment authorized via tokenized mock gateway",
    data: toPublicBooking(updated),
    trackUrl: dispatch.trackUrl,
    notifications: { whatsappSent: dispatch.whatsappSent, emailSent: dispatch.emailSent },
  });
});

bookingsRouter.get("/:id", (req, res) => {
  const booking = getBooking(req.params.id);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json({ data: toPublicBooking(booking) });
});
