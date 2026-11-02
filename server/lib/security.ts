import type { Application } from "express";

/**
 * setupSecurity
 *
 * Dynamically imports helmet and cors if available and configures them.
 * Uses CORS_ORIGINS env var (comma-separated) or sensible defaults for local dev.
 */
export async function setupSecurity(app: Application) {
  try {
    const helmetMod = await import("helmet");
    const corsMod = await import("cors");
    const helmet = (helmetMod as any).default ?? helmetMod;
    const cors = (corsMod as any).default ?? corsMod;

    const rawOrigins = process.env.CORS_ORIGINS;
    const origins = rawOrigins ? rawOrigins.split(",").map((s) => s.trim()) : ["http://localhost:3001", "http://localhost:5173"];

    app.use(
      cors({
        origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
          // allow no-origin requests (curl, server-to-server)
          if (!origin) return cb(null, true);
          if (origins.includes(origin)) return cb(null, true);
          // Allow same-origin localhost variants
          if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return cb(null, true);
          return cb(new Error("CORS not allowed"), false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      }),
    );

    // Basic helmet defaults
    app.use(helmet());

    // Content Security Policy (minimal, permissive enough for demo, tighten for prod)
    if ((helmet as any).contentSecurityPolicy) {
      try {
        app.use(
          (helmet as any).contentSecurityPolicy({
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
              styleSrc: ["'self'", "'unsafe-inline'", "https:"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https:", "ws:"],
            },
          }),
        );
      } catch {
        // ignore CSP setup errors
      }
    }

    console.log("[security] helmet & cors configured");
  } catch (err) {
    console.warn("[security] helmet or cors not available — skipping security middleware");
  }
}
