"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

const PROFILE_COPY = {
  en: {
    eyebrow: "Your travel identity",
    title: "Traveler profile",
    intro: "Your personal corner for every route planned, place imagined, and story still waiting to begin.",
    loading: "Loading traveler profile",
    pass: "Explorer pass",
    ready: "Ready for departure",
    promise: "One profile. Every journey uniquely yours.",
    traveler: "Traveler",
    totalTrips: "Total trips generated",
    fullName: "Full name",
    email: "Email address",
    plan: "Plan a new trip",
    view: "View my trips",
    errorTitle: "Your profile missed its connection.",
    errorBody: "We could not load your traveler profile.",
    retry: "Try again",
  },
  id: {
    eyebrow: "Identitas perjalanan Anda",
    title: "Profil traveler",
    intro: "Ruang pribadi untuk setiap rute yang direncanakan, tempat yang dibayangkan, dan cerita yang menanti untuk dimulai.",
    loading: "Memuat profil traveler",
    pass: "Pas penjelajah",
    ready: "Siap berangkat",
    promise: "Satu profil. Setiap perjalanan menjadi milik Anda.",
    traveler: "Traveler",
    totalTrips: "Total trip dibuat",
    fullName: "Nama lengkap",
    email: "Alamat email",
    plan: "Rencanakan trip baru",
    view: "Lihat trip saya",
    errorTitle: "Profil Anda tertinggal dari perjalanan.",
    errorBody: "Kami tidak dapat memuat profil traveler Anda.",
    retry: "Coba lagi",
  },
} as const;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const { isProfileLoading, profileError, refreshUser, user } = useAuth();
  const { locale } = useLanguage();
  const copy = PROFILE_COPY[locale];

  return (
    <main className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-[#081a1c] px-5 py-12 text-[#f6eedd] sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute -left-32 top-8 size-80 rounded-full bg-[#d16850]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-96 rounded-full bg-[#2e7773]/14 blur-3xl" />

      <section className="relative mx-auto w-full max-w-5xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#f3c769]">
            {copy.eyebrow}
          </p>
          <h1 className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            {copy.intro}
          </p>
        </div>

        {isProfileLoading && !user ? (
          <div
            className="grid gap-px overflow-hidden rounded-[30px] border border-white/10 bg-white/10 lg:grid-cols-[0.82fr_1.18fr]"
            role="status"
            aria-live="polite"
          >
            <div className="min-h-72 animate-pulse bg-[#0d2c2e]" />
            <div className="min-h-72 animate-pulse bg-[#f6eedd]/90" />
            <span className="sr-only">{copy.loading}</span>
          </div>
        ) : user ? (
          <div className="grid overflow-hidden rounded-[30px] border border-white/10 bg-[#f6eedd] shadow-[0_34px_90px_-42px_rgba(0,0,0,0.9)] lg:grid-cols-[0.82fr_1.18fr]">
            <div className="relative flex min-h-80 flex-col justify-between overflow-hidden bg-[#0d2c2e] p-7 sm:p-10">
              <div className="absolute -right-16 -top-16 size-48 rounded-full border border-[#f3c769]/15" />
              <div className="absolute -right-8 -top-8 size-32 rounded-full border border-[#f3c769]/20" />

              <div className="relative">
                <span className="inline-flex rounded-full border border-[#f3c769]/30 bg-[#f3c769]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f3c769]">
                  {copy.pass}
                </span>
                <div className="mt-8 grid size-24 place-items-center rounded-full border border-[#f3c769]/30 bg-[#081a1c] text-3xl font-black tracking-[-0.04em] text-[#f3c769] shadow-[inset_0_0_0_7px_rgba(243,199,105,0.04)]">
                  {initials(user.name) || "TR"}
                </div>
              </div>

              <div className="relative mt-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                  {copy.ready}
                </p>
                <p className="mt-2 max-w-xs text-xl font-black leading-snug">
                  {copy.promise}
                </p>
              </div>
            </div>

            <div className="p-7 text-[#10282a] sm:p-10 lg:p-12">
              <div className="flex flex-col gap-8 border-b border-[#10282a]/10 pb-9 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9f6332]">
                    {copy.traveler}
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                    {user.name}
                  </h2>
                </div>
                <div className="w-fit rounded-2xl bg-[#e7d6ae]/55 px-5 py-4 text-right">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[#0d4545]">
                    {user.total_trips}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#0d4545]/55">
                    {copy.totalTrips}
                  </p>
                </div>
              </div>

              <dl className="py-8">
                <div className="grid gap-2 py-3 sm:grid-cols-[140px_1fr] sm:items-center">
                  <dt className="text-[10px] font-black uppercase tracking-[0.17em] text-[#10282a]/45">
                    {copy.fullName}
                  </dt>
                  <dd className="font-bold">{user.name}</dd>
                </div>
                <div className="grid gap-2 border-t border-[#10282a]/10 py-4 sm:grid-cols-[140px_1fr] sm:items-center">
                  <dt className="text-[10px] font-black uppercase tracking-[0.17em] text-[#10282a]/45">
                    {copy.email}
                  </dt>
                  <dd className="break-all font-bold">{user.email}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="rounded-full bg-[#0d4545] px-6 py-3.5 text-center text-xs font-black text-[#f6eedd] transition hover:bg-[#123b3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9f6332]"
                >
                  {copy.plan}
                </Link>
                <Link
                  href="/trips"
                  className="rounded-full border border-[#0d4545]/20 px-6 py-3.5 text-center text-xs font-black text-[#0d4545] transition hover:border-[#0d4545]/40 hover:bg-[#0d4545]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9f6332]"
                >
                  {copy.view}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[30px] border border-[#d16850]/25 bg-[#d16850]/10 p-8 sm:p-10">
            <p className="text-xl font-black">{copy.errorTitle}</p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {locale === "id" ? copy.errorBody : profileError ?? copy.errorBody}
            </p>
            <button
              type="button"
              onClick={() => void refreshUser()}
              className="mt-6 rounded-full bg-[#f3c769] px-6 py-3 text-xs font-black text-[#081a1c] transition hover:bg-[#ffda82] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {copy.retry}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
