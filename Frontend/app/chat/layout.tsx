import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProtectedApp } from "@/components/ProtectedApp";

export const metadata: Metadata = {
  title: "Conversational Travel Chat | KelanaAI",
  description: "Continue travel conversations with context-aware answers from KelanaAI.",
};

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
