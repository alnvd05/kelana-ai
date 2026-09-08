"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#081a1c] px-6 text-[#f6eedd]">
      <section className="max-w-lg text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-[#f3c769]">KELANA AI</p>
        <h1 className="mt-5 text-4xl font-black">A small detour.</h1>
        <p className="mt-4 leading-7 text-white/65">We couldn’t load this page. Try again in a moment.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button type="button" onClick={retry} className="rounded-full bg-[#f3c769] px-6 py-3 font-bold text-[#081a1c]">Try again</button>
          <Link href="/" className="rounded-full border border-white/30 px-6 py-3">Back to planner</Link>
        </div>
      </section>
    </main>
  );
}
