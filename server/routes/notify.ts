import { Router } from "express";
import { listNotifications, pushNotification } from "../lib/notifications";
import { listAlerts } from "../knowledge/mockCommission";
import { getBooking } from "../lib/store";
import { dispatchBookingConfirmation } from "../lib/dispatch";

export const notifyRouter = Router();

function baseUrlFromRequest(req: { get: (name: string) => string | undefined }): string {
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : process.env.APP_BASE_URL || "http://127.0.0.1:3000";
}

notifyRouter.get("/", (_req, res) => {
  res.json({ data: listNotifications().slice(0, 50) });
});

notifyRouter.post("/booking", async (req, res) => {
  const { to, bookingId, confirmationCode, itemName } = req.body as {
    to?: string;
    bookingId?: string;
    confirmationCode?: string;
    itemName?: string;
  };
  if (!to) {
    res.status(400).json({ error: "to required (email or WhatsApp number)" });
    return;
  }

  const booking = bookingId ? getBooking(bookingId) : undefined;
  if (booking && booking.confirmationCode) {
    const dispatch = await dispatchBookingConfirmation(
      { ...booking, confirmationCode: confirmationCode || booking.confirmationCode },
      { baseUrl: baseUrlFromRequest(req) },
    );
    res.status(201).json({
      data: { trackUrl: dispatch.trackUrl, whatsappSent: dispatch.whatsappSent, emailSent: dispatch.emailSent },
      note: dispatch.emailSent || dispatch.whatsappSent
        ? "Live notification sent where credentials configured"
        : "Logged to notifications.json — set RESEND_API_KEY or WHATSAPP_TOKEN for live send",
    });
    return;
  }

  const push = await pushNotification({
    channel: "push",
    to,
    title: "Booking confirmed",
    body: `${itemName || "Your booking"} is confirmed (${confirmationCode || bookingId}).`,
    meta: { bookingId, confirmationCode },
  });
  const wa = await pushNotification({
    channel: "whatsapp",
    to,
    title: "WhatsApp booking confirmation",
    body: `Zanzibar Guide: Booking confirmed for ${itemName || "your trip"}. Code: ${confirmationCode || "N/A"}`,
    meta: { bookingId, stub: true },
  });
  res.status(201).json({ data: { push, whatsapp: wa }, note: "Demo notification dispatcher (logged, not sent via Meta)" });
});

notifyRouter.post("/safety-blast", async (_req, res) => {
  const alerts = listAlerts();
  const rows = await Promise.all(alerts.map((a) =>
    pushNotification({
      channel: "inapp",
      to: "all-travellers",
      title: `Safety ${a.severity}: ${a.title}`,
      body: a.summary,
      meta: { alertId: a.id },
    }),
  ));
  res.status(201).json({ data: rows });
});
