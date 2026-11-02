import { pushNotification } from "./notifications";
import type { BookingRecord } from "./store";

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Zanzibar Guide <bookings@zanzibarguide.demo>";

export function bookingTrackUrl(confirmationCode: string, baseUrl?: string): string {
  const origin = (baseUrl || process.env.APP_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  return `${origin}/bookings/${encodeURIComponent(confirmationCode)}`;
}

function bookingMessageBody(booking: BookingRecord, trackUrl: string): string {
  return [
    `Zanzibar Guide booking confirmed: ${booking.itemName}`,
    `Confirmation: ${booking.confirmationCode}`,
    `Status: ${booking.status === "paid" ? "Confirmed & paid" : booking.status}`,
    booking.checkIn ? `Check-in: ${booking.checkIn}` : null,
    `Track your booking: ${trackUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendWhatsAppLive(to: string, body: string): Promise<boolean> {
  if (!WA_TOKEN || !WA_PHONE_ID) return false;
  const digits = to.replace(/\D/g, "");
  if (digits.length < 8) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp-send]", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp-send]", err);
    return false;
  }
}

async function sendEmailLive(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to.includes("@")) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error("[email-send]", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email-send]", err);
    return false;
  }
}

export async function dispatchBookingConfirmation(
  booking: BookingRecord,
  opts?: { baseUrl?: string },
): Promise<{ trackUrl: string; whatsappSent: boolean; emailSent: boolean }> {
  const code = booking.confirmationCode || booking.id;
  const trackUrl = bookingTrackUrl(code, opts?.baseUrl);
  const body = bookingMessageBody(booking, trackUrl);
  const subject = `Booking confirmed — ${booking.itemName} (${code})`;
  const html = `
    <p>Hi ${booking.guestName},</p>
    <p>Your booking for <strong>${booking.itemName}</strong> is confirmed.</p>
    <p>Confirmation code: <strong>${code}</strong></p>
    <p><a href="${trackUrl}">Track your booking</a></p>
  `;

  const whatsappSent = booking.phone
    ? await sendWhatsAppLive(booking.phone, body)
    : await sendWhatsAppLive(booking.email, body);

  const emailSent = await sendEmailLive(booking.email, subject, html);

  await pushNotification({
    channel: "whatsapp",
    to: booking.phone || booking.email,
    title: "Booking confirmed",
    body,
    meta: { bookingId: booking.id, confirmationCode: code, trackUrl, live: whatsappSent },
    status: whatsappSent ? "sent" : "queued",
  });

  await pushNotification({
    channel: "push",
    to: booking.email,
    title: subject,
    body: `Track: ${trackUrl}`,
    meta: { bookingId: booking.id, confirmationCode: code, trackUrl, channel: "email", live: emailSent },
    status: emailSent ? "sent" : "queued",
  });

  return { trackUrl, whatsappSent, emailSent };
}
