import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "KelanaAI — Personalized AI Trip Planner",
  description:
    "Create a practical, personalized travel itinerary based on your destination, budget, dates, and travel style.",
  openGraph: {
    title: "KelanaAI — Personalized AI Trip Planner",
    description: "Turn a destination into a thoughtful day-by-day itinerary with KelanaAI.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "KelanaAI — Plan your next adventure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KelanaAI — Personalized AI Trip Planner",
    description: "Turn a destination into a thoughtful day-by-day itinerary with KelanaAI.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
