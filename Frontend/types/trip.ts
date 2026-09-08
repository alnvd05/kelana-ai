export type Trip = {
  id: number;
  destination: string;
  days: number;
  budget: number;
  category: string;
  daily_budget: number;
  travel_style: string | null;
  departure_date: string | null;
  ai_recommendation: string | null;
};

export type CreateTripInput = {
  destination: string;
  days: number;
  budget: number;
  month: string;
  departure_date: string;
  travel_style: string;
};

export type TripSortMode = "latest" | "oldest" | "highest-budget";
