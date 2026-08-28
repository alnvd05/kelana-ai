import type { CreateTripInput, Trip } from "@/types/trip";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export class TripServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TripServiceError";
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return `Request failed (${response.status})`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new TripServiceError(await readErrorMessage(response), response.status);
  }
  return response.json() as Promise<T>;
}

export function getTrips(): Promise<Trip[]> {
  return fetchJson<Trip[]>(`${API_BASE_URL}/trips`, { cache: "no-store" });
}

export function getTrip(id: number): Promise<Trip> {
  return fetchJson<Trip>(`${API_BASE_URL}/trips/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export function createTrip(input: CreateTripInput): Promise<Trip> {
  return fetchJson<Trip>(`${API_BASE_URL}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
