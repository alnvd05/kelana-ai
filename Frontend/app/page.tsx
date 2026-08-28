"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { createTrip } from "@/services/tripService";

/**
 * Fonts
 * Plain CSS font stacks (no next/font/google) so this file has zero
 * external/network dependency and can't fail to resolve at build time.
 */
const displayFont =
  "'Arial Narrow', 'Helvetica Neue Condensed', Impact, Haettenschweiler, sans-serif";
const monoFont =
  "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const bodyFont =
  "ui-sans-serif, -apple-system, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";

const TRAVEL_STYLES = ["Family", "Solo", "Couple", "Backpacker"] as const;

/** Turns free text into a 3-letter "airport style" code, e.g. "Kyoto" -> "KYO" */
function toRouteCode(value: string) {
  const letters = value.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "???").padEnd(3, "\u00B7");
}

/** One day of the structured itinerary the backend now asks Bedrock for. */
type ItineraryDay = {
  day: number;
  location: string;
  morning: string;
  afternoon: string;
  evening: string;
  daily_budget_usd: string;
};

/** The full structured shape we now ask `ai_recommendation` to contain. */
type AiPlan = {
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

/**
 * `ai_recommendation` is stored as plain text in the DB, but the backend
 * prompt now asks Bedrock to return a JSON string matching `AiPlan`. This
 * strips any stray ```json fences the model might still add and parses it.
 * Returns null if the text isn't valid JSON, so the UI can fall back
 * gracefully instead of crashing.
 */
function parseAiPlan(raw: string): AiPlan | null {
  if (!raw || !raw.trim()) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.itinerary)) {
      return parsed as AiPlan;
    }
    return null;
  } catch {
    return null;
  }
}

type DayPlan = { day: string | null; location: string; lines: string[] };

/**
 * Fallback only: if the backend hasn't been updated yet (or Bedrock
 * returns malformed JSON) and `ai_recommendation` is still the old
 * markdown-ish free text, this splits it into per-day chunks by finding
 * every "Day N" marker so the UI still shows something useful.
 */
function parseLegacyItinerary(raw: string): DayPlan[] {
  if (!raw || !raw.trim()) return [];

  const markers = [...raw.matchAll(/Day\s*(\d+)/gi)];
  if (markers.length === 0) {
    return [
      {
        day: null,
        location: "",
        lines: raw.split("\n").map((l) => l.trim()).filter(Boolean),
      },
    ];
  }

  const days: DayPlan[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : raw.length;
    const lines = raw
      .slice(start, end)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let location = "";
    let bodyLines = lines;
    if (lines.length && !/^[#\-*]/.test(lines[0])) {
      location = lines[0].replace(/^[:\-]\s*/, "");
      bodyLines = lines.slice(1);
    }

    days.push({ day: markers[i][1], location, lines: bodyLines });
  }
  return days;
}

/** Renders "**bold**" segments inside a line as real <strong> text. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

type TripResult = {
  id?: number;
  destination: string;
  days: number;
  budget: number;
  category?: string;
  daily_budget?: number;
  travel_style?: string;
  ai_recommendation?: string;
};

type Status = "idle" | "generating" | "ready";

export default function Page() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState<number | "">(2000);
  const [days, setDays] = useState(5);
  const [style, setStyle] = useState<string>("Family");
  const [customStyle, setCustomStyle] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ticketNo = useId().replace(/\D/g, "").padStart(4, "0").slice(-4);

  const handleBudgetChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setBudget(digits === "" ? "" : Number(digits));
  };

  /** "2026-06-15" -> "June" (backend's `month` field expects a month name). */
  const getMonthName = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { month: "long" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !departureDate) return;

    setStatus("generating");
    setErrorMsg(null);
    setTripResult(null);

    try {
      const trip = await createTrip({
        destination: destination.trim(),
        budget: budget === "" ? 0 : budget,
        days,
        month: getMonthName(departureDate),
        travel_style: style === "Other" ? customStyle.trim() || "Custom" : style,
      });
      setStatus("ready");
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  };

  const handleReset = () => {
    setTripResult(null);
    setErrorMsg(null);
    setStatus("idle");
  };

  const activeStyle = style === "Other" ? customStyle || "Custom" : style;
  const routeCode = toRouteCode(destination);
  const plan = tripResult?.ai_recommendation ? parseAiPlan(tripResult.ai_recommendation) : null;
  const legacyItinerary =
    !plan && tripResult?.ai_recommendation ? parseLegacyItinerary(tripResult.ai_recommendation) : [];

  return (
    <main className="kelana-page" style={{ fontFamily: bodyFont }}>
      <div className="backdrop" aria-hidden="true" />

      <section className="ticket-wrap is-in">
        <div className="homepage-card grid w-full overflow-hidden rounded-[28px] bg-[#f6eedd] shadow-[0_32px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-[#c79a44]/30 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)]">
          <aside className="hero-panel relative min-h-[340px] overflow-hidden lg:min-h-[760px]">
            <Image
              src="/bali-coast.jpg"
              alt="Lush cliffs meeting the turquoise sea in Bali, Indonesia"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#081a1c]/20 via-[#081a1c]/25 to-[#081a1c]/90" />
            <div className="absolute inset-0 flex flex-col justify-between p-6 text-white sm:p-9 lg:p-12">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-white/25 bg-[#081a1c]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                  Featured Destination
                </span>
                <span className="text-xs font-medium text-white/80">Bali, Indonesia</span>
              </div>

              <div className="max-w-xl">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#f3c769]">
                  Go farther, plan smarter
                </p>
                <h2 className="max-w-lg text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
                  Your next story starts somewhere beautiful.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-white/80 sm:text-base">
                  Tell KelanaAI where you want to go. Get a practical, personalized itinerary in moments.
                </p>
                <a
                  href="#planner"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f6eedd] px-5 py-3 text-sm font-bold text-[#0e2a2c] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3c769] lg:hidden"
                >
                  Start planning <span aria-hidden="true">&darr;</span>
                </a>
              </div>

              <a
                href="https://unsplash.com/photos/green-and-brown-mountain-beside-blue-sea-under-blue-sky-during-daytime-bFO5ATLt_7o"
                target="_blank"
                rel="noreferrer"
                className="w-fit text-[10px] text-white/55 underline-offset-4 hover:text-white hover:underline"
              >
                Photo by Melvin on Unsplash
              </a>
            </div>
          </aside>

          <div id="planner" className="booking-panel scroll-mt-4 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
            <header className="page-head">
              <p className="eyebrow">Itinerary Request &middot; No. {ticketNo}</p>
              <h1 style={{ fontFamily: displayFont }}>
                <svg
                  className="compass"
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="15" cy="15" r="13" stroke="var(--brass)" strokeWidth="1.6" />
                  <path d="M15 5L18 15L15 25L12 15Z" fill="var(--brass)" />
                  <circle cx="15" cy="15" r="2" fill="var(--paper)" />
                </svg>
                Kelana<span>AI</span>
              </h1>
              <p className="tagline">Plan your next adventure</p>
              <Link
                href="/trips"
                className="mt-4 inline-flex rounded-full border border-[#c79a44]/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a2e] transition hover:border-[#c79a44] hover:bg-white"
              >
                View My Trips →
              </Link>
            </header>

            <form className="ticket" onSubmit={handleSubmit}>
          {/* Stub: from -> to, updates live as the destination is typed */}
          <div className="stub">
            <div className="stub-leg">
              <span className="stub-label">From</span>
              <span className="stub-code" style={{ fontFamily: monoFont }}>HOM</span>
            </div>
            <svg className="stub-plane" width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden="true">
              <path
                d="M1 7H21M21 7L15 2M21 7L15 12"
                stroke="var(--brass)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="stub-leg stub-leg--right">
              <span className="stub-label">To</span>
              <span className="stub-code" style={{ fontFamily: monoFont }}>{routeCode}</span>
            </div>
          </div>

          <div className="perforation" role="presentation" />

          <div className="ticket-body">
            <div className="field">
              <label htmlFor="destination">Destination</label>
              <div className="input-shell">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 15s5-4.6 5-8.6A5 5 0 0 0 3 6.4C3 10.4 8 15 8 15Z"
                    stroke="var(--brass-ink)"
                    strokeWidth="1.3"
                  />
                  <circle cx="8" cy="6.4" r="1.7" stroke="var(--brass-ink)" strokeWidth="1.3" />
                </svg>
                <input
                  id="destination"
                  name="destination"
                  type="text"
                  placeholder="Japan, South Korea, Italy…"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="field-row grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="budget">Budget (USD)</label>
                <div className="input-shell">
                  <span className="prefix">$</span>
                  <input
                    id="budget"
                    name="budget"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={budget === "" ? "" : budget.toLocaleString("en-US")}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="days">Days</label>
                <div className="input-shell input-shell--stepper">
                  <button
                    type="button"
                    aria-label="Fewer days"
                    onClick={() => setDays((d) => Math.max(1, d - 1))}
                  >
                    &minus;
                  </button>
                  <input
                    id="days"
                    name="days"
                    type="text"
                    inputMode="numeric"
                    value={days}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                      setDays(Number.isNaN(n) ? 1 : Math.min(30, Math.max(1, n)));
                    }}
                  />
                  <button
                    type="button"
                    aria-label="More days"
                    onClick={() => setDays((d) => Math.min(30, d + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="departure-date">Departure date</label>
              <div className="input-shell">
                <input
                  id="departure-date"
                  name="departure_date"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="travel-style">Travel style</label>
              <div className="chips" role="group" aria-label="Travel style" id="travel-style">
                {TRAVEL_STYLES.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`chip ${style === opt ? "chip--active" : ""}`}
                    onClick={() => setStyle(opt)}
                    aria-pressed={style === opt}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ${style === "Other" ? "chip--active" : ""}`}
                  onClick={() => setStyle("Other")}
                  aria-pressed={style === "Other"}
                >
                  Other
                </button>
              </div>
              {style === "Other" && (
                <div className="input-shell" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Describe your style…"
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="barcode" role="presentation" />
            <p className="ticket-meta" style={{ fontFamily: monoFont }}>
              {routeCode} &bull; {days}D &bull; {activeStyle.toUpperCase()}
            </p>

            <button type="submit" className="cta" disabled={status === "generating"}>
              {status === "generating" ? (
                <span className="cta-loading">
                  <span className="spinner" aria-hidden="true" />
                  {"Generating…"}
                </span>
              ) : (
                "Generate AI Trip"
              )}
            </button>

            <p className={`status-line ${errorMsg ? "status-line--error" : ""}`} aria-live="polite">
              {errorMsg
                ? `Couldn't reach KelanaAI \u2014 ${errorMsg}`
                : status === "ready"
                ? "Trip saved — opening your AI recommendation."
                : "Four fields, one button \u2014 that's all Kelana needs to start planning."}
            </p>
          </div>
            </form>
          </div>
        </div>

        {tripResult && (
          <div className="result-panel">
            <div className="result-summary">
              <span>
                Destination: <strong>{tripResult.destination}</strong>
              </span>
              <span>
                Budget: <strong>{tripResult.budget.toLocaleString("en-US")}</strong>
              </span>
            </div>

            {plan ? (
              <>
                <p className="result-title">Daily Itinerary</p>
                {plan.itinerary.map((d, i) => (
                  <div className="day-card" key={i}>
                    <div className="day-card-head">
                      <span className="day-card-title">Day {d.day}</span>
                      {d.location && <span className="day-card-location">{d.location}</span>}
                    </div>
                    <p className="day-card-subhead">Morning</p>
                    <p className="day-card-line">{renderInline(d.morning)}</p>
                    <p className="day-card-subhead">Afternoon</p>
                    <p className="day-card-line">{renderInline(d.afternoon)}</p>
                    <p className="day-card-subhead">Evening</p>
                    <p className="day-card-line">{renderInline(d.evening)}</p>
                    {d.daily_budget_usd && (
                      <p className="day-card-budget">Estimated budget: {d.daily_budget_usd}</p>
                    )}
                  </div>
                ))}

                {plan.travel_tips?.length > 0 && (
                  <div className="section-block">
                    <p className="result-title">Travel Tips</p>
                    <ul className="plain-list">
                      {plan.travel_tips.map((tip, i) => (
                        <li key={i}>{renderInline(tip)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.local_food_recommendations?.length > 0 && (
                  <div className="section-block">
                    <p className="result-title">Local Food Recommendations</p>
                    <ul className="plain-list">
                      {plan.local_food_recommendations.map((food, i) => (
                        <li key={i}>{renderInline(food)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.budget_breakdown && (
                  <div className="section-block">
                    <p className="result-title">Estimated Budget Breakdown</p>
                    <div className="budget-table">
                      <div className="budget-row">
                        <span>Accommodation</span>
                        <span>{plan.budget_breakdown.accommodation}</span>
                      </div>
                      <div className="budget-row">
                        <span>Transportation</span>
                        <span>{plan.budget_breakdown.transportation}</span>
                      </div>
                      <div className="budget-row">
                        <span>Food</span>
                        <span>{plan.budget_breakdown.food}</span>
                      </div>
                      <div className="budget-row">
                        <span>Activities</span>
                        <span>{plan.budget_breakdown.activities}</span>
                      </div>
                      <div className="budget-row budget-row--total">
                        <span>Total</span>
                        <span>{plan.budget_breakdown.total_estimated}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : legacyItinerary.length > 0 ? (
              <>
                <p className="result-title">AI Recommendation</p>
                {legacyItinerary.map((d, i) => (
                  <div className="day-card" key={i}>
                    {(d.day || d.location) && (
                      <div className="day-card-head">
                        {d.day && <span className="day-card-title">Day {d.day}</span>}
                        {d.location && <span className="day-card-location">{d.location}</span>}
                      </div>
                    )}
                    {d.lines.map((line, li) => {
                      if (/^#{1,6}\s*/.test(line)) {
                        return (
                          <p className="day-card-subhead" key={li}>
                            {line.replace(/^#{1,6}\s*/, "")}
                          </p>
                        );
                      }
                      if (/^[-*]\s*/.test(line)) {
                        return (
                          <p className="day-card-bullet" key={li}>
                            {renderInline(line.replace(/^[-*]\s*/, ""))}
                          </p>
                        );
                      }
                      return (
                        <p className="day-card-line" key={li}>
                          {renderInline(line)}
                        </p>
                      );
                    })}
                  </div>
                ))}
              </>
            ) : (
              <p className="status-line">No recommendation text was returned.</p>
            )}

            <button type="button" className="cta cta--ghost" onClick={handleReset}>
              Plan Another Trip
            </button>
          </div>
        )}
      </section>
      <footer className="site-footer relative z-10 mt-8 flex w-full max-w-[1180px] flex-col items-center justify-between gap-4 border-t border-[#c79a44]/25 px-2 pt-6 text-center text-xs text-[#f6eedd]/60 sm:flex-row sm:text-left">
        <p>&copy; {new Date().getFullYear()} KelanaAI. Your trip, thoughtfully planned.</p>
        <nav className="site-footer-links flex items-center gap-3" aria-label="Footer navigation">
          <a className="transition hover:text-[#f3c769]" href="#planner">Planner Alvin Djunaedi</a>
          <span aria-hidden="true">&middot;</span>
          <a className="transition hover:text-[#f3c769]" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
          <span aria-hidden="true">&middot;</span>
          <a className="transition hover:text-[#f3c769]" href="mailto:alvindjunaidi05@gmail.com">alvindjunaidi05@gmail.com</a>
        </nav>
      </footer>

      <style jsx>{`
        .kelana-page {
          --bg: #0e2a2c;
          --bg-deep: #081a1c;
          --paper: #f6eedd;
          --paper-line: #e4d8bc;
          --brass: #c79a44;
          --brass-ink: #8a6a2e;
          --stamp: #a23825;
          --stamp-dark: #862d1e;
          --ink: #182421;

          min-height: 100dvh;
          background: radial-gradient(120% 140% at 50% -10%, #133638 0%, var(--bg) 45%, var(--bg-deep) 100%);
          color: var(--ink);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 40px 20px 24px;
          position: relative;
          overflow-x: hidden;
        }

        .backdrop {
          position: absolute;
          inset: 0;
          opacity: 0.5;
          background-image: repeating-linear-gradient(
            115deg,
            rgba(199, 154, 68, 0.05) 0px,
            rgba(199, 154, 68, 0.05) 1px,
            transparent 1px,
            transparent 64px
          );
          pointer-events: none;
        }

        .ticket-wrap {
          position: relative;
          width: 100%;
          max-width: 1180px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .ticket-wrap.is-in {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .ticket-wrap {
            transition: none;
            opacity: 1;
            transform: none;
          }
        }

        .page-head {
          text-align: center;
          margin-bottom: 22px;
          color: var(--ink);
        }
        .eyebrow {
          font: 500 11px/1 ${monoFont};
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brass);
          margin: 0 0 10px;
        }
        h1 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 0.01em;
          margin: 0;
        }
        h1 span {
          color: var(--brass);
        }
        .tagline {
          margin: 8px 0 0;
          font-size: 14px;
          color: #68736f;
        }

        .compass {
          animation: spin-slow 46s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin-slow {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .compass {
            animation: none;
          }
        }

        .ticket {
          background: transparent;
        }

        .stub {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          gap: 12px;
        }
        .stub-leg {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stub-leg--right {
          align-items: flex-end;
        }
        .stub-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--brass-ink);
        }
        .stub-code {
          font-size: 20px;
          font-weight: 500;
          letter-spacing: 0.06em;
        }
        .stub-plane {
          margin-top: 12px;
          flex-shrink: 0;
        }

        .perforation {
          position: relative;
          height: 0;
          border-top: 1.5px dashed var(--paper-line);
          margin: 0 0;
        }
        .perforation::before,
        .perforation::after {
          display: none;
        }

        .ticket-body {
          padding: 26px 0 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-row {
          display: grid;
        }
        label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--brass-ink);
        }

        .input-shell {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid var(--paper-line);
          border-radius: 10px;
          padding: 11px 13px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-shell:focus-within {
          border-color: var(--brass);
          box-shadow: 0 0 0 3px rgba(199, 154, 68, 0.25);
        }
        .input-shell input {
          border: 0;
          outline: none;
          background: transparent;
          font-size: 15px;
          color: var(--ink);
          width: 100%;
          font-family: inherit;
        }
        .input-shell .prefix {
          font-size: 13px;
          color: var(--brass-ink);
          font-weight: 600;
        }

        .input-shell--stepper {
          justify-content: space-between;
        }
        .input-shell--stepper input {
          text-align: center;
        }
        .input-shell--stepper button {
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          border-radius: 7px;
          border: 1px solid var(--paper-line);
          background: var(--paper);
          color: var(--ink);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
        }
        .input-shell--stepper button:hover {
          border-color: var(--brass);
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--paper-line);
          background: #fff;
          font-size: 13px;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .chip:hover {
          border-color: var(--brass);
        }
        .chip--active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--paper);
        }

        .barcode {
          height: 30px;
          border-radius: 3px;
          background-image: repeating-linear-gradient(
            90deg,
            var(--ink) 0px,
            var(--ink) 2px,
            transparent 2px,
            transparent 5px,
            var(--ink) 5px,
            var(--ink) 6px,
            transparent 6px,
            transparent 11px,
            var(--ink) 11px,
            var(--ink) 13px,
            transparent 13px,
            transparent 17px
          );
          opacity: 0.82;
        }
        .ticket-meta {
          margin: -10px 0 0;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--brass-ink);
          text-align: center;
        }

        .cta {
          border: 0;
          border-radius: 12px;
          padding: 15px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--paper);
          background: linear-gradient(180deg, var(--stamp) 0%, var(--stamp-dark) 100%);
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.15s ease;
          box-shadow: 0 10px 20px -8px rgba(162, 56, 37, 0.55);
        }
        .cta:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .cta:disabled {
          opacity: 0.75;
          cursor: progress;
        }
        .cta:focus-visible {
          outline: 2px solid var(--brass);
          outline-offset: 3px;
        }

        .cta-loading {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(246, 238, 221, 0.35);
          border-top-color: var(--paper);
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: none;
          }
        }

        .status-line {
          margin: 0;
          font-size: 12px;
          text-align: center;
          color: #6b6155;
        }
        .status-line--error {
          color: var(--stamp);
          font-weight: 600;
        }

        .result-panel {
          margin-top: 18px;
          background: var(--paper);
          border-radius: 18px;
          box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(199, 154, 68, 0.25);
          padding: 22px 24px 24px;
        }
        .result-summary {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 13px;
          color: var(--ink);
          padding-bottom: 14px;
          border-bottom: 1.5px dashed var(--paper-line);
          margin-bottom: 14px;
        }
        .result-title {
          margin: 0 0 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--brass-ink);
        }
        .day-card {
          background: #fff;
          border: 1px solid var(--paper-line);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 12px;
        }
        .day-card:last-child {
          margin-bottom: 0;
        }
        .day-card-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--paper-line);
        }
        .day-card-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--stamp);
        }
        .day-card-location {
          font-size: 12px;
          font-style: italic;
          color: var(--brass-ink);
        }
        .day-card-subhead {
          margin: 10px 0 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--brass-ink);
        }
        .day-card-subhead:first-child {
          margin-top: 0;
        }
        .day-card-bullet {
          margin: 0 0 4px;
          padding-left: 14px;
          position: relative;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink);
        }
        .day-card-bullet::before {
          content: "•";
          position: absolute;
          left: 0;
          color: var(--brass);
        }
        .day-card-line {
          margin: 0 0 6px;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--ink);
        }
        .day-card-line:last-child,
        .day-card-bullet:last-child {
          margin-bottom: 0;
        }
        .day-card-budget {
          margin: 10px 0 0;
          padding-top: 8px;
          border-top: 1px dashed var(--paper-line);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--stamp);
        }

        .section-block {
          margin-top: 20px;
        }
        .plain-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .plain-list li {
          position: relative;
          padding-left: 16px;
          margin-bottom: 6px;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--ink);
        }
        .plain-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: var(--brass);
        }
        .plain-list li:last-child {
          margin-bottom: 0;
        }

        .budget-table {
          background: #fff;
          border: 1px solid var(--paper-line);
          border-radius: 10px;
          overflow: hidden;
        }
        .budget-row {
          display: flex;
          justify-content: space-between;
          padding: 9px 14px;
          font-size: 13px;
          color: var(--ink);
          border-bottom: 1px solid var(--paper-line);
        }
        .budget-row:last-child {
          border-bottom: 0;
        }
        .budget-row--total {
          background: var(--paper);
          font-weight: 800;
          color: var(--stamp);
        }

        .cta--ghost {
          background: transparent;
          border: 1.5px solid var(--stamp);
          color: var(--stamp);
          box-shadow: none;
          margin-top: 16px;
        }
        .cta--ghost:hover {
          background: rgba(162, 56, 37, 0.06);
        }

        input:focus-visible,
        button:focus-visible {
          outline: 2px solid var(--brass);
          outline-offset: 2px;
        }

        @media (max-width: 420px) {
          h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  );
}
