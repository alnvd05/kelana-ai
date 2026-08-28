"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { formatBudget, getDestinationIcon } from "@/lib/tripPresentation";
import type { Trip } from "@/types/trip";

type TripCardProps = {
  trip: Trip;
};

const CATEGORY_STYLES: Record<string, string> = {
  backpacker: "border-[#7dd3a8]/30 bg-[#2d7c59]/20 text-[#9ce4bd]",
  standard: "border-[#80bfff]/30 bg-[#245f91]/20 text-[#9bcfff]",
  luxury: "border-[#f3c769]/40 bg-[#c79a44]/15 text-[#f3c769]",
};

export function TripCard({ trip }: TripCardProps) {
  const { locale } = useLanguage();
  const isIndonesian = locale === "id";
  const categoryStyle =
    CATEGORY_STYLES[trip.category.toLowerCase()] ??
    "border-white/20 bg-white/5 text-white/70";

  return (
    <Link
      href={`/trips/${trip.id}`}
      aria-label={isIndonesian ? `Lihat detail trip ${trip.destination}` : `View ${trip.destination} trip details`}
      className="group flex min-h-64 flex-col rounded-3xl border border-white/10 bg-[#0e2a2c] p-6 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.9)] transition duration-200 hover:-translate-y-1 hover:border-[#c79a44]/55 hover:shadow-[0_24px_55px_-28px_rgba(199,154,68,0.35)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3c769]"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="grid size-12 place-items-center rounded-2xl bg-white/5 text-2xl"
          aria-hidden="true"
        >
          {getDestinationIcon(trip.destination)}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${categoryStyle}`}
        >
          {isIndonesian
            ? ({ Backpacker: "Hemat", Standard: "Standar", Luxury: "Mewah" }[trip.category] ?? trip.category)
            : trip.category}
        </span>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-black tracking-tight text-[#f6eedd] transition group-hover:text-[#f3c769]">
          {trip.destination}
        </h2>
        <p className="mt-2 text-sm text-[#f6eedd]/65">
          {trip.days} {isIndonesian ? "hari" : "days"} <span aria-hidden="true">·</span> {formatBudget(trip.budget)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#f6eedd]/70">
          ♟ {trip.travel_style || (isIndonesian ? "Fleksibel" : "Flexible")}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#f6eedd]/70">
          {formatBudget(trip.daily_budget)}/{isIndonesian ? "hari" : "day"}
        </span>
      </div>

      <span className="mt-auto flex items-center justify-between pt-6 text-sm font-black text-[#f3c769]">
        {isIndonesian ? "Lihat Detail" : "View Details"}
        <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
