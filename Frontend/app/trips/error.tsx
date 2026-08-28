"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

export default function TripsError({ retry }: { retry: () => void }) {
  const { locale } = useLanguage();
  const isIndonesian = locale === "id";

  return (
    <main className="grid min-h-dvh place-items-center bg-[#081a1c] px-5 text-[#f6eedd]">
      <section className="w-full max-w-xl rounded-3xl border border-[#d16850]/40 bg-[#4b211d]/40 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ee927c]">
          {isIndonesian ? "Terjadi kesalahan" : "Unexpected error"}
        </p>
        <h1 className="mt-3 text-3xl font-black">
          {isIndonesian ? "Dashboard trip berhenti merespons." : "The trip dashboard stopped responding."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          {isIndonesian
            ? "Coba muat halaman ini kembali. Trip Anda tetap tersimpan aman di PostgreSQL."
            : "Try rendering this page again. Your saved trips remain safely stored in PostgreSQL."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-[#f3c769] px-5 py-3 text-sm font-black text-[#081a1c]"
          >
            {isIndonesian ? "Coba Lagi" : "Try Again"}
          </button>
          <Link href="/" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold">
            {isIndonesian ? "Kembali ke Planner" : "Back to Planner"}
          </Link>
        </div>
      </section>
    </main>
  );
}
