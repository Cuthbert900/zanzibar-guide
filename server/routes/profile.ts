import { Router } from "express";
import type { InterestTag } from "../../shared/catalog";
import { learnTravelProfile, personalizedRecommendations, type TravelProfile } from "../lib/profileLearning";
import { getContext, putContext } from "../lib/store";
import { authFromHeader, getUserById, updateUser } from "../lib/users";
import { trackEvent } from "../lib/store";

export const profileRouter = Router();

async function applyLearn(opts: {
  userId?: string;
  sessionId?: string;
  bookingIds?: string[];
  favorites?: Array<{ id: string }>;
  interests?: InterestTag[];
  budgetMax?: number;
  existing?: TravelProfile | null;
}): Promise<TravelProfile> {
  const profile = learnTravelProfile({
    existing: opts.existing,
    bookingIds: opts.bookingIds,
    favorites: opts.favorites,
    explicitInterests: opts.interests,
    explicitBudgetMax: opts.budgetMax,
  });

  if (opts.userId) {
    await updateUser(opts.userId, { travelProfile: profile });
  }

  if (opts.sessionId) {
    await putContext(opts.sessionId, {
      interests: profile.interests,
      budgetMax: profile.budgetMax,
      historySummary: profile.historySummary,
    });
  }

  return profile;
}

profileRouter.get("/me", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  const ctx = sessionId ? getContext(sessionId) : null;

  if (user) {
    const fresh = await applyLearn({
      userId: user.id,
      sessionId,
      bookingIds: user.bookingIds,
      favorites: user.favorites || [],
      interests: user.travelProfile?.interests?.length ? undefined : ctx?.interests,
      budgetMax: user.travelProfile?.budgetMax ?? ctx?.budgetMax,
      existing: user.travelProfile,
    });
    const recs = personalizedRecommendations(fresh);
    res.json({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        bookingIds: user.bookingIds,
        favoritesCount: user.favorites?.length || 0,
        profile: fresh,
        recommendations: recs,
      },
    });
    return;
  }

  // Guest session profile
  const guest = await applyLearn({
    sessionId,
    interests: ctx?.interests,
    budgetMax: ctx?.budgetMax,
  });
  res.json({
    data: {
      userId: null,
      profile: guest,
      recommendations: personalizedRecommendations(guest),
      note: "Log in to persist travel history across devices",
    },
  });
});

profileRouter.post("/learn", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  const body = req.body as {
    sessionId?: string;
    interests?: InterestTag[];
    budgetMax?: number;
  };

  const profile = await applyLearn({
    userId: user?.id,
    sessionId: body.sessionId,
    bookingIds: user?.bookingIds,
    favorites: user?.favorites || [],
    interests: body.interests,
    budgetMax: body.budgetMax,
    existing: user?.travelProfile,
  });

  await trackEvent({
    type: "profile_learn",
    channel: "web",
    intent: "personalization",
    meta: { style: profile.travelStyle, bookings: profile.bookingCount },
  });

  res.json({
    data: {
      profile,
      recommendations: personalizedRecommendations(profile),
    },
  });
});

profileRouter.get("/recommendations", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  let profile = user?.travelProfile;
  if (user) {
    profile = await applyLearn({
      userId: user.id,
      sessionId,
      bookingIds: user.bookingIds,
      favorites: user.favorites || [],
      existing: user.travelProfile,
    });
  } else if (sessionId) {
    const ctx = getContext(sessionId);
    profile = await applyLearn({ sessionId, interests: ctx.interests, budgetMax: ctx.budgetMax });
  }
  if (!profile) {
    res.status(400).json({ error: "Provide auth or sessionId" });
    return;
  }
  res.json({ data: personalizedRecommendations(profile), profile });
});

/** Called after booking pay to refresh learning loop */
export async function learnAfterBooking(userId: string | undefined, sessionId?: string): Promise<TravelProfile | null> {
  if (!userId) return null;
  const user = getUserById(userId);
  if (!user) return null;
  return applyLearn({
    userId,
    sessionId,
    bookingIds: user.bookingIds,
    favorites: user.favorites || [],
    existing: user.travelProfile,
  });
}
