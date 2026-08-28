export type ItineraryDay = {
  day: number;
  location: string;
  morning: string;
  afternoon: string;
  evening: string;
  daily_budget_usd: string;
};

export type AiPlan = {
  itinerary: ItineraryDay[];
  travel_tips: string[];
  local_food_recommendations: string[];
  budget_breakdown: {
    accommodation: string;
    transportation: string;
    food: string;
    activities: string;
    total_estimated: string;
  };
};

const DESTINATION_ICONS: Record<string, string> = {
  bali: "🌴",
  indonesia: "🌴",
  japan: "🗾",
  korea: "🏯",
  "south korea": "🏯",
  singapore: "🦁",
  italy: "🏛️",
  france: "🗼",
  thailand: "🛕",
  australia: "🦘",
};

export function formatBudget(value: number): string {
  return `USD ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function getDestinationIcon(destination: string): string {
  const normalized = destination.trim().toLowerCase();
  const exactMatch = DESTINATION_ICONS[normalized];
  if (exactMatch) return exactMatch;

  const partialMatch = Object.entries(DESTINATION_ICONS).find(([name]) =>
    normalized.includes(name),
  );
  return partialMatch?.[1] ?? "✈️";
}

export function parseAiPlan(raw: string | null): AiPlan | null {
  if (!raw?.trim()) return null;

  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object") return null;

    const candidate = value as Partial<AiPlan>;
    return Array.isArray(candidate.itinerary) ? (candidate as AiPlan) : null;
  } catch {
    return null;
  }
}

