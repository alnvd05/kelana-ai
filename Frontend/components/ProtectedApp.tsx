"use client";

import { AppHeader } from "@/components/AppHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export function ProtectedApp({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-dvh bg-[#081a1c]">
        <AppHeader />
        {children}
      </div>
    </ProtectedRoute>
  );
}
