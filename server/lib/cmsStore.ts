import {
  CATALOG_LOCATIONS,
  FAQ_ARTICLES,
  SAFETY_ADVISORIES,
  type FaqArticle,
  type SafetyAdvisory,
  type TourismLocation,
} from "../../shared/catalog";
import { readState, writeState } from "./database";

export interface CmsData {
  attractions: TourismLocation[];
  faqs: FaqArticle[];
  alerts: SafetyAdvisory[];
}

function seedCms(): CmsData {
  return {
    attractions: structuredClone(CATALOG_LOCATIONS),
    faqs: structuredClone(FAQ_ARTICLES),
    alerts: structuredClone(SAFETY_ADVISORIES),
  };
}

let cachedCms: CmsData = seedCms();

export async function initializeCmsStore(): Promise<void> {
  cachedCms = await readState("cms", seedCms());
}

export function readCms(): CmsData {
  const data = cachedCms;
  const seedById = new Map(CATALOG_LOCATIONS.map((l) => [l.id, l]));
  data.attractions = (data.attractions || []).map((a) => {
    const seed = seedById.get(a.id);
    if (!seed) return a;
    return {
      ...seed,
      ...a,
      wheelchairAccessible: a.wheelchairAccessible ?? seed.wheelchairAccessible,
      familyFriendly: a.familyFriendly ?? seed.familyFriendly,
      petFriendly: a.petFriendly ?? seed.petFriendly,
      audioGuide: a.audioGuide ?? seed.audioGuide,
      multiSensory: a.multiSensory ?? seed.multiSensory,
      parkingUsd: a.parkingUsd ?? seed.parkingUsd,
      transitNotes: a.transitNotes ?? seed.transitNotes,
      rideShareAvailable: a.rideShareAvailable ?? seed.rideShareAvailable,
      budgetTier: a.budgetTier ?? seed.budgetTier,
      crowdLevel: a.crowdLevel ?? seed.crowdLevel,
      bestSeason: a.bestSeason ?? seed.bestSeason,
      tags: a.tags?.length ? a.tags : seed.tags,
    };
  });
  const faqIds = new Set((data.faqs || []).map((f) => f.id));
  for (const f of FAQ_ARTICLES) {
    if (!faqIds.has(f.id)) data.faqs.push(f);
  }
  return data;
}

export async function writeCms(data: CmsData): Promise<CmsData> {
  cachedCms = data;
  await writeState("cms", data);
  return data;
}

export async function patchCms(partial: Partial<CmsData>): Promise<CmsData> {
  const current = readCms();
  return writeCms({
    attractions: partial.attractions ?? current.attractions,
    faqs: partial.faqs ?? current.faqs,
    alerts: partial.alerts ?? current.alerts,
  });
}
