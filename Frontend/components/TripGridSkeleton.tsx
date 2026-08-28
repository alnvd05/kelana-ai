export function TripGridSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading trips">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="min-h-64 rounded-3xl border border-white/5 bg-white/[0.04] p-6">
          <div className="flex justify-between">
            <div className="size-12 rounded-2xl bg-white/10" />
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-7 h-7 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/10" />
          <div className="mt-7 h-7 w-3/4 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

