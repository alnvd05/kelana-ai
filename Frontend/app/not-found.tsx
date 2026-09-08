import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#081a1c] px-6 text-[#f6eedd]">
      <section className="max-w-lg text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-[#f3c769]">KELANA AI · 404</p>
        <h1 className="mt-5 text-4xl font-black">This path is still unexplored.</h1>
        <p className="mt-4 leading-7 text-white/65">The page may have moved, or the address may be incorrect. Let’s get you back to planning your next journey.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-[#f3c769] px-6 py-3 font-bold text-[#081a1c]">Back to planner</Link>
      </section>
    </main>
  );
}
