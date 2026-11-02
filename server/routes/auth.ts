import { Router, type Response } from "express";
import { AuthError, authFromHeader, endSession, loginUser, registerUser, updateUser } from "../lib/users";
import { authRateLimitMiddleware } from "../lib/rateLimiter";

export const authRouter = Router();

function sendAuthError(res: Response, err: unknown, status: number, fallback: string) {
  if (err instanceof AuthError) {
    res.status(status).json({ error: err.message, field: err.field });
    return;
  }
  console.error("[auth]", err);
  res.status(500).json({ error: fallback });
}

authRouter.post("/register", authRateLimitMiddleware, async (req, res) => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const result = await registerUser(email, password, name || "Traveller");
    res.status(201).json({ data: result });
  } catch (err) {
    sendAuthError(res, err, 400, "Register failed");
  }
});

authRouter.post("/login", authRateLimitMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const result = await loginUser(email, password);
    res.json({ data: result });
  } catch (err) {
    sendAuthError(res, err, 401, "Login failed");
  }
});

authRouter.post("/logout", async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) await endSession(header.slice(7));
  res.status(204).end();
});

authRouter.get("/me", (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ data: user });
});

authRouter.put("/me/favorites", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const favorites = (req.body as { favorites?: unknown }).favorites;
  if (!Array.isArray(favorites)) {
    res.status(400).json({ error: "favorites array required" });
    return;
  }
  const updated = await updateUser(user.id, { favorites: favorites as never });
  res.json({ data: updated });
});

authRouter.put("/me/trips", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const trips = (req.body as { trips?: unknown }).trips;
  if (!Array.isArray(trips)) {
    res.status(400).json({ error: "trips array required" });
    return;
  }
  const updated = await updateUser(user.id, { trips: trips as never });
  res.json({ data: updated });
});
