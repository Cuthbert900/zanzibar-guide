import { Router } from "express";
import { getById } from "../knowledge/mockCommission";
import { trackEvent } from "../lib/store";

export const budgetRouter = Router();

budgetRouter.post("/estimate", async (req, res) => {
  const body = req.body as {
    days?: number;
    partySize?: number;
    lodgingPerNight?: number;
    hotelId?: string;
    mealsPerDayPerPerson?: number;
    activityIds?: string[];
    activityBudgetPerDay?: number;
    transportPerDay?: number;
    miscPerDay?: number;
    contingencyPct?: number;
  };

  const days = Math.min(30, Math.max(1, Number(body.days) || 3));
  const party = Math.min(12, Math.max(1, Number(body.partySize) || 2));
  let lodging = Number(body.lodgingPerNight);
  if (!Number.isFinite(lodging) && body.hotelId) {
    const h = getById(body.hotelId);
    lodging = h?.pricePerNight ?? 120;
  }
  if (!Number.isFinite(lodging)) lodging = 120;

  const meals = Number.isFinite(Number(body.mealsPerDayPerPerson))
    ? Number(body.mealsPerDayPerPerson)
    : 35;
  const transport = Number.isFinite(Number(body.transportPerDay)) ? Number(body.transportPerDay) : 40;
  const misc = Number.isFinite(Number(body.miscPerDay)) ? Number(body.miscPerDay) : 20;
  const contingencyPct = Number.isFinite(Number(body.contingencyPct))
    ? Math.min(40, Math.max(0, Number(body.contingencyPct)))
    : 10;

  const activityIds = Array.isArray(body.activityIds) ? body.activityIds : [];
  const activityLines = activityIds
    .map((id) => {
      const loc = getById(id);
      if (!loc) return null;
      const fee = loc.entryFee ?? 0;
      return { id: loc.id, name: loc.name, feeUsd: fee, totalUsd: fee * party };
    })
    .filter(Boolean) as Array<{ id: string; name: string; feeUsd: number; totalUsd: number }>;

  const activitiesFixed = activityLines.reduce((s, a) => s + a.totalUsd, 0);
  const activityDaily =
    Number.isFinite(Number(body.activityBudgetPerDay)) && Number(body.activityBudgetPerDay) > 0
      ? Number(body.activityBudgetPerDay) * days * party
      : 0;

  const lodgingTotal = lodging * days;
  const mealsTotal = meals * days * party;
  const transportTotal = transport * days;
  const miscTotal = misc * days;
  const activitiesTotal = activitiesFixed + activityDaily;
  const subtotal = lodgingTotal + mealsTotal + transportTotal + miscTotal + activitiesTotal;
  const contingency = Math.round(subtotal * (contingencyPct / 100));
  const total = subtotal + contingency;
  const perPerson = Math.round((total / party) * 100) / 100;
  const perDay = Math.round((total / days) * 100) / 100;

  await trackEvent({
    type: "budget_estimate",
    channel: "web",
    intent: "budget",
    meta: { days, party, total },
  });

  res.json({
    currency: "USD",
    data: {
      days,
      partySize: party,
      breakdown: {
        lodging: lodgingTotal,
        meals: mealsTotal,
        transport: transportTotal,
        misc: miscTotal,
        activities: activitiesTotal,
        contingency,
      },
      activityLines,
      assumptions: {
        lodgingPerNight: lodging,
        mealsPerDayPerPerson: meals,
        transportPerDay: transport,
        miscPerDay: misc,
        contingencyPct,
      },
      subtotal,
      total,
      perPerson,
      perDay,
    },
  });
});
