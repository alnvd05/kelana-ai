import type { CreateTripInput, Trip } from "@/types/trip";
import { apiRequest } from "@/lib/apiClient";

export function getTrips(): Promise<Trip[]> {
  return apiRequest<Trip[]>("/trips", { cache: "no-store" });
}

export function getTrip(id: number): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export function createTrip(input: CreateTripInput): Promise<Trip> {
  return apiRequest<Trip>("/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
