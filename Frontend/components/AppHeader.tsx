"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

const HEADER_COPY = {
  en: {
    planner: "Plan a Trip",
    plannerShort: "Plan",
    trips: "My Trips",
    tripsShort: "Trips",
    profile: "Profile",
    welcome: "Welcome back,",
    logout: "Log out",
    navigation: "Primary navigation",
    language: "Choose language",
    profileLabel: (name: string) => `Open ${name}'s traveler profile`,
  },
  id: {
    planner: "Rencanakan",
    plannerShort: "Rencana",
    trips: "Trip Saya",
    tripsShort: "Trip",
    profile: "Profil",
    welcome: "Selamat datang,",
    logout: "Keluar",
    navigation: "Navigasi utama",
    language: "Pilih bahasa",
    profileLabel: (name: string) => `Buka profil traveler ${name}`,
  },
} as const;

function travelerName(email: string | null): string {
  const localPart = email?.split("@")[0] ?? "Traveler";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { email, logout, user } = useAuth();
  const { locale, setLocale } = useLanguage();
  const copy = HEADER_COPY[locale];
  const name = user?.name || travelerName(email);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  function handleLogout() {
    logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#c79a44]/20 bg-[#081a1c]/92 text-[#f6eedd] shadow-[0_14px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-black tracking-[-0.04em] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3c769]"
          aria-label="KelanaAI trip planner"
        >
          <span className="grid size-9 place-items-center rounded-full border border-[#f3c769]/55 text-sm text-[#f3c769]" aria-hidden="true">
            ✦
          </span>
          <span className="hidden sm:inline">Kelana<span className="text-[#f3c769]">AI</span></span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1" aria-label={copy.navigation}>
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 ${
              pathname === "/"
                ? "bg-[#f3c769] text-[#081a1c]"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span className="hidden sm:inline">{copy.planner}</span>
            <span className="sm:hidden">{copy.plannerShort}</span>
          </Link>
          <Link
            href="/trips"
            aria-current={pathname.startsWith("/trips") ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 ${
              pathname.startsWith("/trips")
                ? "bg-[#f3c769] text-[#081a1c]"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span className="hidden sm:inline">{copy.trips}</span>
            <span className="sm:hidden">{copy.tripsShort}</span>
          </Link>
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 ${
              pathname === "/profile"
                ? "bg-[#f3c769] text-[#081a1c]"
                : "text-white/60 hover:text-white"
            }`}
          >
            {copy.profile}
          </Link>
        </nav>

        <Link
          href="/profile"
          className="hidden min-w-0 items-center gap-3 border-l border-white/10 pl-4 transition hover:text-white md:flex"
          aria-label={copy.profileLabel(name)}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0e3b3d] text-[11px] font-black text-[#f3c769] ring-1 ring-[#f3c769]/25">
            {initials || "TR"}
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
              {copy.welcome}
            </span>
            <span className="block max-w-36 truncate text-xs font-black">{name}</span>
          </span>
        </Link>

        <div
          className="hidden items-center rounded-full border border-white/10 bg-white/[0.035] p-1 xl:flex"
          role="group"
          aria-label={copy.language}
        >
          {(["en", "id"] as const).map((language) => (
            <button
              key={language}
              type="button"
              aria-pressed={locale === language}
              onClick={() => setLocale(language)}
              className={`rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                locale === language
                  ? "bg-[#f3c769] text-[#081a1c]"
                  : "text-white/45 hover:text-white"
              }`}
            >
              {language}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-white/70 transition hover:border-[#d16850]/60 hover:bg-[#a23825]/15 hover:text-[#f6eedd] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3c769] sm:px-4"
        >
          {copy.logout}
        </button>
      </div>
    </header>
  );
}
