import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProtectedApp } from "@/components/ProtectedApp";

export const metadata: Metadata = {
  title: "Traveler Profile | KelanaAI",
  description: "View your KelanaAI traveler details and generated trips.",
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
