import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProtectedApp } from "@/components/ProtectedApp";

export const metadata: Metadata = {
  title: "Travel Assistant | KelanaAI",
  description: "Ask travel questions and get answers grounded in trusted documents.",
};

export default function AssistantLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
