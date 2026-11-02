import { Router } from "express";
import { generateTourismReply, type ChatTurn } from "../chat";
import { trackEvent } from "../lib/store";

export const messagingRouter = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "travelguide-verify";
const WA_CONFIGURED = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** Meta webhook verification (hub.challenge echo) — works without live credentials. */
messagingRouter.get("/whatsapp", (req, res) => {
  const mode = String(req.query["hub.mode"] || "");
  const token = String(req.query["hub.verify_token"] || "");
  const challenge = String(req.query["hub.challenge"] || "");
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).json({
    error: "Verification failed",
    hint: `Set WHATSAPP_VERIFY_TOKEN (default: travelguide-verify). Live send: ${WA_CONFIGURED ? "credentials present" : "stub mode"}`,
  });
});

messagingRouter.get("/whatsapp/status", (_req, res) => {
  res.json({
    mode: WA_CONFIGURED ? "live-ready" : "stub",
    verifyTokenSet: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    note: WA_CONFIGURED
      ? "WHATSAPP_TOKEN + PHONE_NUMBER_ID set — outbound Graph API can be wired next"
      : "Demo stub — inbound POST returns AI reply without calling Meta",
  });
});

/**
 * WhatsApp connector stub — accepts Meta-style inbound payloads (simplified)
 * and returns the assistant reply. No Meta credentials required for demo.
 */
messagingRouter.post("/whatsapp", async (req, res) => {
  try {
    const body = req.body as {
      from?: string;
      text?: string;
      message?: { text?: { body?: string }; from?: string };
      entry?: Array<{
        changes?: Array<{ value?: { messages?: Array<{ text?: { body?: string }; from?: string }> } }>;
      }>;
      sessionId?: string;
    };

    let text =
      body.text ||
      body.message?.text?.body ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      "";
    const from =
      body.from ||
      body.message?.from ||
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
      "whatsapp-demo";

    if (!text.trim()) {
      res.status(400).json({ error: "No message text found in WhatsApp payload" });
      return;
    }

    const messages: ChatTurn[] = [{ role: "user", content: text.trim() }];
    const result = await generateTourismReply(messages, {
      sessionId: body.sessionId || `wa_${from}`,
    });

    await trackEvent({
      type: "whatsapp_message",
      channel: "whatsapp",
      intent: "chat",
      meta: { from },
    });

    res.json({
      connector: WA_CONFIGURED ? "whatsapp-live-ready" : "whatsapp-stub",
      mode: WA_CONFIGURED ? "live-ready" : "stub",
      note: WA_CONFIGURED
        ? "Credentials present — reply generated locally; Graph API send not invoked in demo"
        : "Demo stub — not connected to Meta Cloud API. Set WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID for live.",
      from,
      reply: {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: result.content },
      },
      rich: {
        locations: result.locations,
        faqLinks: result.faqLinks,
        alerts: result.alerts,
      },
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    console.error("[whatsapp]", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "WhatsApp stub failed" });
  }
});
