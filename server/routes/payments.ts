import { Router } from "express";
import Stripe from "stripe";
import { getBooking, saveBooking } from "../lib/store";
import { authFromHeader, updateUser } from "../lib/users";
import { dispatchBookingConfirmation } from "../lib/dispatch";
import { toPublicBooking } from "../lib/bookingsStore";

export const paymentsRouter = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

paymentsRouter.get("/config", (_req, res) => {
  res.json({
    mode: process.env.STRIPE_SECRET_KEY ? "stripe-sandbox" : "token-mock",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    note: process.env.STRIPE_SECRET_KEY
      ? "Stripe sandbox enabled"
      : "Set STRIPE_SECRET_KEY for real Stripe Checkout; mock token pay still available",
  });
});

paymentsRouter.post("/checkout-session", async (req, res) => {
  const stripe = getStripe();
  const { bookingId, successUrl, cancelUrl } = req.body as {
    bookingId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  if (!bookingId) {
    res.status(400).json({ error: "bookingId required" });
    return;
  }
  const booking = getBooking(bookingId);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (!stripe) {
    res.status(200).json({
      mode: "token-mock",
      message: "Stripe not configured — use POST /api/bookings/:id/pay with tok_*",
      bookingId,
    });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl || `http://localhost:3000/?paid=${bookingId}`,
      cancel_url: cancelUrl || `http://localhost:3000/?cancel=${bookingId}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.max(50, Math.round(booking.amountUsd * 100)),
            product_data: { name: booking.itemName },
          },
        },
      ],
      metadata: { bookingId },
    });
    res.json({ mode: "stripe-sandbox", url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Stripe error" });
  }
});

paymentsRouter.post("/confirm-stripe", async (req, res) => {
  const { bookingId, sessionId } = req.body as { bookingId?: string; sessionId?: string };
  const booking = bookingId ? getBooking(bookingId) : undefined;
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const stripe = getStripe();
  if (stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        res.status(400).json({ error: "Payment not completed" });
        return;
      }
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : "Stripe verify failed" });
      return;
    }
  }
  const updated = await saveBooking({
    ...booking,
    status: "paid",
    paymentRef: sessionId || `stripe_demo_${Date.now()}`,
    confirmationCode: booking.confirmationCode || `TG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  });
  const user = authFromHeader(req.headers.authorization);
  if (user) {
    await updateUser(user.id, {
      bookingIds: Array.from(new Set([updated.id, ...(user.bookingIds || [])])).slice(0, 50),
    });
  }
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${proto}://${host}` : undefined;
  const dispatch = await dispatchBookingConfirmation(updated, { baseUrl });
  res.json({ data: toPublicBooking(updated), trackUrl: dispatch.trackUrl });
});
