import { initializeAuditStore } from "./audit";
import { initializeBookingsStore } from "./bookingsStore";
import { initializeCmsStore } from "./cmsStore";
import { initializeEngagementStore } from "./engagement";
import { initializeHandoffStore } from "./handoff";
import { initializeNotificationsStore } from "./notifications";
import { initializeRagStore } from "./rag";
import { initializeReviewsStore } from "./reviews";
import { initializeSharedTripsStore } from "./sharedTrips";
import { initializeTravelerMemoryStore } from "./travelerMemory";
import { initializeUsersStore } from "./users";
import { connectDatabase } from "./database";
import { initializeCoreStores } from "./store";

export async function initializeStores(): Promise<void> {
  await connectDatabase();
  await Promise.all([
    initializeAuditStore(),
    initializeBookingsStore(),
    initializeCmsStore(),
    initializeEngagementStore(),
    initializeHandoffStore(),
    initializeNotificationsStore(),
    initializeRagStore(),
    initializeReviewsStore(),
    initializeSharedTripsStore(),
    initializeTravelerMemoryStore(),
    initializeUsersStore(),
    initializeCoreStores(),
  ]);
}