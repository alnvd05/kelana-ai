import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Trips | KelanaAI",
  description: "Browse and revisit every itinerary saved by KelanaAI.",
};

export default function TripsLayout({ children }: { children: ReactNode }) {
  return children;
}
