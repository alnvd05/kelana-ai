export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#081a1c] px-6 text-[#f6eedd]">
      <div role="status" aria-live="polite" className="text-center">
        <span aria-hidden="true" className="mx-auto block size-12 animate-spin rounded-full border-2 border-[#f3c769]/20 border-t-[#f3c769] motion-reduce:animate-none" />
        <p className="mt-6 text-lg font-bold">Opening KelanaAI…</p>
        <p className="mt-2 text-sm text-white/60">Your next journey is on its way.</p>
      </div>
    </main>
  );
}
