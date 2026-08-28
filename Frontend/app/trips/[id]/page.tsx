"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

import { formatBudget, getDestinationIcon, parseAiPlan } from "@/lib/tripPresentation";
import { getTrip } from "@/services/tripService";
import type { Trip } from "@/types/trip";

type TripDetailPageProps = {
  params: Promise<{ id: string }>;
};

function labelFromKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = use(params);
  const tripId = Number(id);
  const isValidTripId = Number.isInteger(tripId) && tripId > 0;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(isValidTripId);
  const [error, setError] = useState<string | null>(null);

  const loadTrip = useCallback(async () => {
    if (!Number.isInteger(tripId) || tripId <= 0) {
      setError("The trip ID in this URL is not valid.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setTrip(await getTrip(tripId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load this trip.");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!isValidTripId) return;

    let ignore = false;
    getTrip(tripId)
      .then((savedTrip) => {
        if (!ignore) setTrip(savedTrip);
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setError(reason instanceof Error ? reason.message : "Unable to load this trip.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isValidTripId, tripId]);

  const plan = parseAiPlan(trip?.ai_recommendation ?? null);
  const visibleError = isValidTripId ? error : "The trip ID in this URL is not valid.";

  return (
    <main className="min-h-dvh bg-[#081a1c] px-5 py-8 text-[#f6eedd] sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#f3c769] transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to Trips
        </Link>

        {isLoading && (
          <div className="mt-8 animate-pulse rounded-3xl border border-[#c79a44]/20 bg-[#0e2a2c] p-8">
            <div className="h-10 w-1/2 rounded bg-white/10" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-24 rounded-2xl bg-white/5" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && visibleError && (
          <section className="mt-8 rounded-3xl border border-[#d16850]/40 bg-[#4b211d]/40 p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ee927c]">Trip unavailable</p>
            <h1 className="mt-3 text-3xl font-black">We could not open this itinerary.</h1>
            <p className="mt-3 text-[#f6eedd]/70">{visibleError}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadTrip()}
                className="rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c]"
              >
                Try Again
              </button>
              <Link href="/trips" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">
                View All Trips
              </Link>
            </div>
          </section>
        )}

        {!isLoading && !visibleError && trip && (
          <article className="mt-8">
            <header className="overflow-hidden rounded-3xl border border-[#c79a44]/25 bg-gradient-to-br from-[#123b3d] to-[#0e2a2c] p-7 shadow-2xl sm:p-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-5xl" aria-hidden="true">
                    {getDestinationIcon(trip.destination)}
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#f3c769]">Saved itinerary</p>
                  <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">{trip.destination}</h1>
                </div>
                <span className="w-fit rounded-full border border-[#f3c769]/40 bg-[#f3c769]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f3c769]">
                  {trip.category}
                </span>
              </div>

              <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-black/15 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Budget</dt>
                  <dd className="mt-2 font-black">{formatBudget(trip.budget)}</dd>
                </div>
                <div className="rounded-2xl bg-black/15 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Duration</dt>
                  <dd className="mt-2 font-black">{trip.days} days</dd>
                </div>
                <div className="rounded-2xl bg-black/15 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Daily budget</dt>
                  <dd className="mt-2 font-black">{formatBudget(trip.daily_budget)}</dd>
                </div>
                <div className="rounded-2xl bg-black/15 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Travel style</dt>
                  <dd className="mt-2 font-black">{trip.travel_style || "Not specified"}</dd>
                </div>
              </dl>
            </header>

            <section className="mt-6 rounded-3xl bg-[#f6eedd] p-6 text-[#182421] sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a2e]">AI recommendation</p>
              <h2 className="mt-2 text-3xl font-black">Your day-by-day plan</h2>

              {plan ? (
                <div className="mt-7 space-y-5">
                  {plan.itinerary.map((day) => (
                    <section key={day.day} className="rounded-2xl border border-[#d8c9a8] bg-white/60 p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-xl font-black">Day {day.day}</h3>
                        <span className="text-sm font-bold text-[#8a6a2e]">{day.location}</span>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        {[
                          ["Morning", day.morning],
                          ["Afternoon", day.afternoon],
                          ["Evening", day.evening],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a2e]">{label}</p>
                            <p className="mt-1 text-sm leading-6 text-[#31433e]">{value}</p>
                          </div>
                        ))}
                      </div>
                      {day.daily_budget_usd && (
                        <p className="mt-4 border-t border-[#d8c9a8] pt-3 text-sm font-bold">
                          Daily estimate: {day.daily_budget_usd}
                        </p>
                      )}
                    </section>
                  ))}

                  <div className="grid gap-5 lg:grid-cols-2">
                    {plan.travel_tips?.length > 0 && (
                      <section className="rounded-2xl bg-[#0e2a2c] p-5 text-[#f6eedd]">
                        <h3 className="text-lg font-black">Travel Tips</h3>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/75">
                          {plan.travel_tips.map((tip) => <li key={tip}>{tip}</li>)}
                        </ul>
                      </section>
                    )}
                    {plan.local_food_recommendations?.length > 0 && (
                      <section className="rounded-2xl bg-[#0e2a2c] p-5 text-[#f6eedd]">
                        <h3 className="text-lg font-black">Local Food</h3>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/75">
                          {plan.local_food_recommendations.map((food) => <li key={food}>{food}</li>)}
                        </ul>
                      </section>
                    )}
                  </div>

                  {plan.budget_breakdown && (
                    <section className="rounded-2xl border border-[#d8c9a8] p-5">
                      <h3 className="text-lg font-black">Budget Breakdown</h3>
                      <dl className="mt-3 divide-y divide-[#d8c9a8]">
                        {Object.entries(plan.budget_breakdown).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4 py-3 text-sm">
                            <dt>{labelFromKey(key)}</dt>
                            <dd className="font-black">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                </div>
              ) : trip.ai_recommendation ? (
                <div className="mt-7 whitespace-pre-wrap rounded-2xl border border-[#d8c9a8] bg-white/60 p-5 text-sm leading-7">
                  {trip.ai_recommendation}
                </div>
              ) : (
                <div className="mt-7 rounded-2xl border border-dashed border-[#c79a44] p-6 text-center text-[#5f6c68]">
                  This saved trip does not have an AI recommendation yet.
                </div>
              )}
            </section>

            <nav
              className="mt-6 flex flex-col gap-3 rounded-3xl border border-[#c79a44]/25 bg-[#0e2a2c] p-5 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Trip result actions"
            >
              <div>
                <p className="font-black">Ready for your next adventure?</p>
                <p className="mt-1 text-sm text-[#f6eedd]/60">Start a fresh itinerary from the planner.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Plan Another Trip
                </Link>
              </div>
            </nav>
          </article>
        )}
      </div>
    </main>
  );
}
