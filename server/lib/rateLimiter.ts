import type { RequestHandler } from "express";

/**
 * apiRateLimitMiddleware
 *
 * Attempts to use a Redis-backed rate limiter (rate-limiter-flexible + ioredis).
 * If those packages or Redis are unavailable, falls back to a simple in-memory
 * sliding window limiter. The module will try to upgrade to a Redis-based limiter
 * asynchronously if possible — the exported middleware delegates to the current
 * implementation.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX = Number(process.env.RATE_LIMIT_MAX || 120);

type ConsumeResult = {
  remaining?: number;
  msBeforeNext?: number;
} | null;

let impl: {
  name: string;
  consume: (key: string) => Promise<ConsumeResult>;
} = {
  name: "memory",
  consume: async (key: string) => {
    // Use a global map so the state survives ESM reloads in dev
    const globalAny = globalThis as any;
    if (!globalAny.__zg_rate_limiter_hits) globalAny.__zg_rate_limiter_hits = new Map<string, { count: number; reset: number }>();
    const hits: Map<string, { count: number; reset: number }> = globalAny.__zg_rate_limiter_hits;

    const now = Date.now();
    const row = hits.get(key);
    if (!row || row.reset < now) {
      hits.set(key, { count: 1, reset: now + WINDOW_MS });
      return { remaining: MAX - 1 };
    }
    row.count += 1;
    hits.set(key, row);
    return { remaining: MAX - row.count };
  },
};

// Try to upgrade to Redis-backed limiter if packages are present
(async function tryUpgrade() {
  try {
    const rlf = await import("rate-limiter-flexible");
    const ioredisMod = await import("ioredis");
    const Redis = (ioredisMod as any).default ?? ioredisMod;

    const { RateLimiterRedis } = rlf as any;

    const redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

    const rl = new RateLimiterRedis({
      storeClient: redisClient,
      points: MAX,
      duration: Math.max(1, Math.floor(WINDOW_MS / 1000)),
      keyPrefix: "zg_rl",
      inmemoryBlockOnConsumed: 0,
      inmemoryBlockDuration: 0,
    });

    impl = {
      name: "redis",
      consume: async (key: string) => {
        try {
          const res = await rl.consume(key);
          // rate-limiter-flexible returns remainingPoints (newer) or pointsRemaining (older)
          const remaining = (res && (res.remainingPoints ?? res.remaining ?? res.pointsRemaining ?? 0)) as number;
          return { remaining };
        } catch (err: any) {
          // If consumed and blocked, err.msBeforeNext indicates when to try again
          if (err && typeof err.msBeforeNext === "number") {
            return { remaining: 0, msBeforeNext: err.msBeforeNext };
          }
          return null;
        }
      },
    };

    console.log("[rateLimiter] using Redis-backed rate limiter (rate-limiter-flexible)");
  } catch (err) {
    console.warn("[rateLimiter] Redis or rate-limiter-flexible not found — using in-memory fallback");
  }
})();

/**
 * authRateLimitMiddleware
 *
 * A tighter per-IP limit for login and registration, to slow down password guessing.
 * Always in-memory, so the count is per server process.
 */
const AUTH_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000);
const AUTH_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);
const authHits = new Map<string, { count: number; reset: number }>();

export const authRateLimitMiddleware: RequestHandler = (req, res, next) => {
  const ip = (req.ip || (req.headers["x-forwarded-for"] as string) || "local").toString();
  const now = Date.now();
  const row = authHits.get(ip);
  if (!row || row.reset < now) {
    if (authHits.size > 1000) {
      authHits.forEach((entry, key) => {
        if (entry.reset < now) authHits.delete(key);
      });
    }
    authHits.set(ip, { count: 1, reset: now + AUTH_WINDOW_MS });
    next();
    return;
  }
  row.count += 1;
  if (row.count > AUTH_MAX) {
    res.setHeader("Retry-After", String(Math.ceil((row.reset - now) / 1000)));
    res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    return;
  }
  next();
};

export const apiRateLimitMiddleware: RequestHandler = async (req, res, next) => {
  const ip = (req.ip || (req.headers["x-forwarded-for"] as string) || "local").toString();
  try {
    const result = await impl.consume(ip);
    if (result) {
      if (typeof result.msBeforeNext === "number" && result.msBeforeNext > 0) {
        res.setHeader("Retry-After", String(Math.ceil(result.msBeforeNext / 1000)));
        res.status(429).json({ error: "Rate limit exceeded" });
        return;
      }
      if (typeof result.remaining === "number" && result.remaining <= 0) {
        res.status(429).json({ error: "Rate limit exceeded" });
        return;
      }
    }
  } catch (err) {
    // On limiter error, allow the request but log a warning
    // This avoids hard-failing requests when Redis or the limiter has an issue.
    // The server should still monitor logs/metrics for repeated failures.
    // eslint-disable-next-line no-console
    console.warn("[rateLimiter] error while checking limit — allowing request", err);
  }
  next();
};
