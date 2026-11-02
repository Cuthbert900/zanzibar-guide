import { randomUUID } from "crypto";
import { readState, writeState } from "./database";

export interface SharedTrip {
  id: string;
  title: string;
  summary: string;
  days: Array<{ day: number; title: string; notes?: string; locationIds?: string[] }>;
  createdAt: string;
}

let trips: SharedTrip[] = [];

export async function initializeSharedTripsStore(): Promise<void> {
  trips = (await readState("shared-trips", { trips: [] })).trips;
}

export async function saveSharedTrip(trip: Omit<SharedTrip, "id" | "createdAt"> & { id?: string }): Promise<SharedTrip> {
  const row: SharedTrip = {
    id: trip.id || `share_${randomUUID().slice(0, 8)}`,
    title: trip.title,
    summary: trip.summary,
    days: trip.days,
    createdAt: new Date().toISOString(),
  };
  trips = [row, ...trips].slice(0, 100);
  await writeState("shared-trips", { trips });
  return row;
}

export function getSharedTrip(id: string): SharedTrip | undefined {
  return trips.find((t) => t.id === id);
}
