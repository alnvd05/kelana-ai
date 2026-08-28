"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { locale } = useLanguage();

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isReady, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#081a1c] px-6 text-[#f6eedd]">
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-full border border-[#f3c769]/45 text-xl text-[#f3c769]">
            ✦
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#f3c769]">
            {locale === "id" ? "Memeriksa pas perjalanan Anda" : "Checking your travel pass"}
          </p>
        </div>
      </main>
    );
  }

  return children;
}
