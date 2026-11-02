import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { generateTourismReply, streamTourismReply, type ChatTurn } from "./chat";
import { attractionsRouter } from "./routes/attractions";
import { accommodationsRouter } from "./routes/accommodations";
import { safetyRouter } from "./routes/safety";
import { knowledgeRouter } from "./routes/knowledge";
import { emergencyRouter } from "./routes/emergency";
import { bookingsRouter } from "./routes/bookings";
import { contextRouter } from "./routes/context";
import { analyticsRouter } from "./routes/analytics";
import { messagingRouter } from "./routes/messaging";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { notifyRouter } from "./routes/notify";
import { itineraryRouter } from "./routes/itinerary";
import { openDataRouter } from "./routes/openData";
import { paymentsRouter } from "./routes/payments";
import { visionRouter } from "./routes/vision";
import { companionRouter, inventoryRouter, liveRouter } from "./routes/companion";
import { handoffRouter } from "./routes/handoff";
import { ragRouter } from "./routes/rag";
import { travelExtrasRouter } from "./routes/travelExtras";
import { shareRouter } from "./routes/share";
import { evalRouter } from "./routes/eval";
import { catalogRouter } from "./routes/catalog";
import { reviewsRouter } from "./routes/reviews";
import { budgetRouter } from "./routes/budget";
import { engagementRouter } from "./routes/engagement";
import { profileRouter } from "./routes/profile";
import { zanzibarFeaturesRouter } from "./routes/zanzibarFeatures";
import { trackEvent } from "./lib/store";
import { PUBLIC_DIR } from "./lib/paths";
import { closeDatabase } from "./lib/database";
import { initializeStores } from "./lib/initializeStores";
import { apiRateLimitMiddleware } from "./lib/rateLimiter";
import { setupSecurity } from "./lib/security";

export function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "12mb" }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    if (process.env.ENABLE_HSTS === "1") {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    next();
  });

  app.use((req, res, next) => {
    const id = (req.headers["x-request-id"] as string) || randomUUID();
    res.setHeader("x-request-id", id);
    next();
  });

  // Rate limiter (Redis-backed if available, else in-memory fallback)
  // Configure security middleware (helmet, cors) asynchronously if available.
  // setupSecurity will dynamically import helmet/cors and configure the app.
  // We call it without awaiting so app startup is not blocked in dev, but
  // in production you may want to make createApiApp async and await setupSecurity.
  try {
    setupSecurity(app).catch(() => {});
  } catch {
    // ignore
  }

  // Use the Redis-backed limiter if available, else in-memory fallback inside the module.
  app.use("/api/", apiRateLimitMiddleware);

  app.get("/api/health", (_req, res) => {
    const preference = (process.env.AI_PROVIDER || "auto").toLowerCase();
    const activeAiProvider = preference === "auto" ? "auto" : preference;
    const aiConfigured =
      preference === "auto" ||
      activeAiProvider === "ollama" ||
      (activeAiProvider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
      (activeAiProvider === "gemini" && Boolean(process.env.GEMINI_API_KEY));

    res.json({
      ok: true,
      brand: "Zanzibar Guide",
      poweredBy: "Cassava AI",
      aiProvider: preference,
      activeAiProvider,
      aiConfigured,
      modules: [
        "attractions",
        "accommodations",
        "safety",
        "knowledge",
        "emergency",
        "bookings",
        "context",
        "analytics",
        "messaging",
        "chat",
        "chat-stream",
        "auth",
        "admin",
        "notify",
        "itinerary",
        "opendata",
        "payments",
        "vision",
        "companion",
        "inventory",
        "live",
        "handoff",
        "rag",
        "packing",
        "souvenirs",
        "translate",
        "share",
        "eval",
        "catalog",
        "reviews",
        "budget",
        "engagement",
        "profile",
        "stories",
        "suitability",
        "arrival",
        "policy",
        "memory",
        "wizard",
      ],
    });
  });

  app.use("/api/zanzibar", zanzibarFeaturesRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/budget", budgetRouter);
  app.use("/api/engagement", engagementRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/attractions", attractionsRouter);
  app.use("/api/accommodations", accommodationsRouter);
  app.use("/api/safety", safetyRouter);
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/emergency", emergencyRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/context", contextRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/messaging", messagingRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notify", notifyRouter);
  app.use("/api/itinerary", itineraryRouter);
  app.use("/api/opendata", openDataRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/vision", visionRouter);
  app.use("/api/companion", companionRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/live", liveRouter);
  app.use("/api/handoff", handoffRouter);
  app.use("/api/rag", ragRouter);
  app.use("/api/share", shareRouter);
  app.use("/api/eval", evalRouter);
  app.use("/api", travelExtrasRouter);

  app.post("/api/chat/stream", async (req, res) => {
    try {
      const body = req.body as {
        messages?: ChatTurn[];
        message?: string;
        sessionId?: string;
        channel?: "web" | "widget" | "whatsapp";
      };
      let messages = body.messages;
      if (!messages?.length && typeof body.message === "string") {
        messages = [{ role: "user", content: body.message }];
      }
      if (!messages?.length) {
        res.status(400).json({ error: "Provide messages or message" });
        return;
      }
      const sanitized: ChatTurn[] = messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
        .slice(-12);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      (res as typeof res & { flushHeaders?: () => void }).flushHeaders?.();

      await trackEvent({
        type: "chat_stream",
        channel: body.channel || "web",
        intent: "chat",
      });

      const send = (obj: unknown) => {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      };

      await streamTourismReply(sanitized, {
        sessionId: body.sessionId,
        authHeader: req.headers.authorization,
        onToken: (token) => send({ type: "token", text: token }),
        onDone: (result) => {
          send({ type: "done", ...result });
          res.write("data: [DONE]\n\n");
          res.end();
        },
      });
    } catch (err) {
      console.error("[api/chat/stream]", err);
      if (!res.headersSent) {
        res.status(502).json({ error: err instanceof Error ? err.message : "Stream failed" });
      } else {
        res.write(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const body = req.body as {
        messages?: ChatTurn[];
        message?: string;
        sessionId?: string;
        channel?: "web" | "widget" | "whatsapp";
      };
      let messages = body.messages;

      if (!messages?.length && typeof body.message === "string") {
        messages = [{ role: "user", content: body.message }];
      }

      if (!messages?.length) {
        res.status(400).json({ error: "Provide messages or message" });
        return;
      }

      const sanitized: ChatTurn[] = messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
        .slice(-12);

      if (!sanitized.length) {
        res.status(400).json({ error: "No valid messages" });
        return;
      }

      const channel = body.channel || "web";
      const lastUser = [...sanitized].reverse().find((m) => m.role === "user")?.content || "";
      await trackEvent({
        type: "chat_message",
        channel,
        intent: "chat",
        meta: { preview: lastUser.slice(0, 80) },
      });

      const result = await generateTourismReply(sanitized, {
        sessionId: body.sessionId,
        authHeader: req.headers.authorization,
      });
      res.json(result);
    } catch (err) {
      console.error("[api/chat]", err);
      const message = err instanceof Error ? err.message : "Chat failed";
      res.status(502).json({ error: message });
    }
  });

  return app;
}

async function startServer() {
  // Validate environment early
  try {
    const { assertEnvConfig } = await import("./lib/env");
    assertEnvConfig();
  } catch (err) {
    console.warn("[env] failed to validate environment:", err);
  }

  await initializeStores();
  const app = createApiApp();
  const server = createServer(app);

  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      next();
    });
    app.use(
      express.static(PUBLIC_DIR, {
        index: false,
        maxAge: "1h",
        etag: true,
      }),
    );
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, "index.html"));
    });
  }

  const port = Number(process.env.PORT || (isProd ? 4000 : 4001));
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Zanzibar Guide listening on http://${host}:${port}/`);
  });

  const shutdown = () => {
    server.close(() => void closeDatabase().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch(console.error);
}
