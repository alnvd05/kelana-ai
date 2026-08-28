"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TripCard } from "@/components/TripCard";
import { TripGridSkeleton } from "@/components/TripGridSkeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { getTrips } from "@/services/tripService";
import type { Trip, TripSortMode } from "@/types/trip";

// The desktop grid has three columns, so 12 fills four complete rows before
// any remaining trips move to the next page. It also divides evenly in the
// two-column tablet layout.
const PAGE_SIZE = 12;

const TRIPS_COPY = {
  en: {
    title: "Trip History",
    intro: "Revisit every itinerary saved in PostgreSQL without generating another AI response.",
    generate: "+ Generate a Trip",
    search: "Search trips",
    searchPlaceholder: "Search destination or travel style...",
    sort: "Sort trips",
    latest: "Latest",
    oldest: "Oldest",
    highestBudget: "Highest Budget",
    showing: (shown: number, total: number) => `Showing ${shown} of ${total} saved ${total === 1 ? "itinerary" : "itineraries"}`,
    loadFallback: "Unable to load trips.",
    loadTitle: "We could not load your trips.",
    retry: "Try Again",
    emptyTitle: "No trips found.",
    emptyBody: "Create your first itinerary to start your history.",
    emptyAction: "Generate a Trip",
    noMatchTitle: "No matching trips.",
    noMatchBody: "Try another destination or travel style.",
    clear: "Clear Search",
    pagination: "Trip history pagination",
    page: (current: number, total: number) => `Page ${current} of ${total}`,
    previous: "Previous",
    next: "Next",
  },
  id: {
    title: "Riwayat Trip",
    intro: "Buka kembali setiap itinerary yang tersimpan tanpa membuat respons AI baru.",
    generate: "+ Buat Trip",
    search: "Cari trip",
    searchPlaceholder: "Cari destinasi atau gaya perjalanan...",
    sort: "Urutkan trip",
    latest: "Terbaru",
    oldest: "Terlama",
    highestBudget: "Budget Tertinggi",
    showing: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} itinerary tersimpan`,
    loadFallback: "Tidak dapat memuat trip.",
    loadTitle: "Kami tidak dapat memuat trip Anda.",
    retry: "Coba Lagi",
    emptyTitle: "Belum ada trip.",
    emptyBody: "Buat itinerary pertama untuk memulai riwayat perjalanan Anda.",
    emptyAction: "Buat Trip",
    noMatchTitle: "Trip tidak ditemukan.",
    noMatchBody: "Coba destinasi atau gaya perjalanan lainnya.",
    clear: "Hapus Pencarian",
    pagination: "Paginasi riwayat trip",
    page: (current: number, total: number) => `Halaman ${current} dari ${total}`,
    previous: "Sebelumnya",
    next: "Berikutnya",
  },
} as const;

export default function TripsPage() {
  const { locale } = useLanguage();
  const copy = TRIPS_COPY[locale];
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<TripSortMode>("latest");
  const [requestedPage, setRequestedPage] = useState(1);

  const matchingTrips = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? trips.filter((trip) =>
          [trip.destination, trip.travel_style ?? ""].some((value) =>
            value.toLowerCase().includes(query),
          ),
        )
      : [...trips];

    return filtered.sort((first, second) => {
      if (sortMode === "oldest") return first.id - second.id;
      if (sortMode === "highest-budget") return second.budget - first.budget;
      return second.id - first.id;
    });
  }, [searchTerm, sortMode, trips]);

  const totalPages = Math.ceil(matchingTrips.length / PAGE_SIZE);
  const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
  const pageTrips = matchingTrips.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setTrips(await getTrips());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.loadFallback);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadFallback]);

  useEffect(() => {
    let ignore = false;

    getTrips()
      .then((savedTrips) => {
        if (!ignore) setTrips(savedTrips);
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setError(reason instanceof Error ? reason.message : copy.loadFallback);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [copy.loadFallback]);

  return (
    <main className="min-h-dvh bg-[#081a1c] px-5 py-8 text-[#f6eedd] sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-6 border-b border-[#c79a44]/30 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-[0.22em] text-[#f3c769] transition hover:text-white"
            >
              KelanaAI
            </Link>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f6eedd]/65 sm:text-base">
              {copy.intro}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c] transition hover:-translate-y-0.5 hover:bg-white"
          >
            {copy.generate}
          </Link>
        </header>

        <section className="pt-8" aria-live="polite">
          {!isLoading && !error && trips.length > 0 && (
            <>
              <div className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-[#0e2a2c] p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label>
                  <span className="sr-only">{copy.search}</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081a1c] px-4 focus-within:border-[#f3c769]">
                    <span aria-hidden="true">⌕</span>
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setRequestedPage(1);
                      }}
                      placeholder={copy.searchPlaceholder}
                      className="w-full bg-transparent py-3 text-sm text-[#f6eedd] outline-none placeholder:text-white/35"
                    />
                  </span>
                </label>
                <label className="relative block">
                  <span className="sr-only">{copy.sort}</span>
                  <select
                    value={sortMode}
                    onChange={(event) => {
                      setSortMode(event.target.value as TripSortMode);
                      setRequestedPage(1);
                    }}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-[#081a1c] py-3 pl-4 pr-12 text-sm text-[#f6eedd] outline-none focus:border-[#f3c769]"
                  >
                    <option value="latest">{copy.latest}</option>
                    <option value="oldest">{copy.oldest}</option>
                    <option value="highest-budget">{copy.highestBudget}</option>
                  </select>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#f6eedd]/85"
                  >
                    <path
                      d="M4 6.25 8 10.25l4-4"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>
              </div>
              <p className="mb-5 text-sm text-[#f6eedd]/60">
                {copy.showing(matchingTrips.length, trips.length)}
              </p>
            </>
          )}

          {isLoading && <TripGridSkeleton />}

          {!isLoading && error && (
            <div className="rounded-3xl border border-[#d16850]/40 bg-[#4b211d]/40 p-8">
              <h2 className="text-xl font-black">{copy.loadTitle}</h2>
              <p className="mt-2 text-sm text-[#f6eedd]/70">{error}</p>
              <button
                type="button"
                onClick={() => void loadTrips()}
                className="mt-5 rounded-full border border-[#f6eedd]/30 px-4 py-2 text-sm font-bold transition hover:border-[#f3c769] hover:text-[#f3c769]"
              >
                {copy.retry}
              </button>
            </div>
          )}

          {!isLoading && !error && trips.length === 0 && (
            <div className="rounded-3xl border border-[#c79a44]/30 bg-[#0e2a2c] p-10 text-center">
              <div className="text-5xl" aria-hidden="true">✈️</div>
              <h2 className="mt-5 text-2xl font-black">{copy.emptyTitle}</h2>
              <p className="mt-2 text-[#f6eedd]/65">{copy.emptyBody}</p>
              <Link
                href="/"
                className="mt-6 inline-flex rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c]"
              >
                {copy.emptyAction}
              </Link>
            </div>
          )}

          {!isLoading && !error && trips.length > 0 && matchingTrips.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#c79a44]/50 bg-[#0e2a2c] p-10 text-center">
              <div className="text-4xl" aria-hidden="true">⌕</div>
              <h2 className="mt-4 text-2xl font-black">{copy.noMatchTitle}</h2>
              <p className="mt-2 text-[#f6eedd]/65">{copy.noMatchBody}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRequestedPage(1);
                }}
                className="mt-5 rounded-full border border-[#f3c769]/50 px-5 py-2 text-sm font-bold text-[#f3c769]"
              >
                {copy.clear}
              </button>
            </div>
          )}

          {!isLoading && !error && matchingTrips.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pageTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e2a2c] p-4 sm:flex-row"
                  aria-label={copy.pagination}
                >
                  <p className="text-sm text-white/55">
                    {copy.page(currentPage, totalPages)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setRequestedPage((page) => Math.max(1, page - 1))}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold transition hover:border-[#f3c769] hover:text-[#f3c769] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      ← {copy.previous}
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        aria-current={page === currentPage ? "page" : undefined}
                        onClick={() => setRequestedPage(page)}
                        className={`size-10 rounded-full text-sm font-black transition ${
                          page === currentPage
                            ? "bg-[#f3c769] text-[#081a1c]"
                            : "border border-white/15 hover:border-[#f3c769] hover:text-[#f3c769]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold transition hover:border-[#f3c769] hover:text-[#f3c769] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {copy.next} →
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
