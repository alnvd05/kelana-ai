import { TripGridSkeleton } from "@/components/TripGridSkeleton";

export default function LoadingTrips() {
  return (
    <main className="min-h-dvh bg-[#081a1c] px-5 py-8 text-[#f6eedd] sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-5 h-12 w-72 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-white/10" />
        <div className="my-8 border-t border-[#c79a44]/20" />
        <TripGridSkeleton />
      </div>
    </main>
  );
}

