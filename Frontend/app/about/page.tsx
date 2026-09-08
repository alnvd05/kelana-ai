import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | KelanaAI",
  description: "Meet KelanaAI, your companion for thoughtful travel planning.",
};

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[#081a1c] px-6 py-12 text-[#f6eedd] sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-[#f3c769]">← KelanaAI</Link>
        <p className="mt-16 text-xs font-bold uppercase tracking-[0.25em] text-[#f3c769]">Made for the curious</p>
        <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Less planning.<br />More exploring.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">KelanaAI helps turn a place you dream of visiting into a journey you can plan. Share your destination, dates, budget, and travel style to create a personalized itinerary.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {[
            ["A trip that fits you", "Explore day-by-day activities, food ideas, and a budget breakdown tailored to your plans."],
            ["Room for questions", "Chat with your AI travel companion and continue previous conversations as your plans evolve."],
            ["Your journeys, together", "Return to saved trips and collect photos and memories in your travel journal."],
            ["You choose the adventure", "AI suggestions are a starting point. Check current prices, opening hours, and travel requirements before booking."],
          ].map(([title, body]) => (
            <section key={title} className="rounded-3xl border border-[#f3c769]/20 bg-white/[0.03] p-7">
              <h2 className="text-lg font-bold text-[#f3c769]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">{body}</p>
            </section>
          ))}
        </div>
        <Link href="/" className="mt-10 inline-block rounded-full bg-[#f3c769] px-7 py-3 font-bold text-[#081a1c]">Plan your next adventure</Link>
      </div>
    </main>
  );
}
