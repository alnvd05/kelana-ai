import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProtectedApp } from "@/components/ProtectedApp";

export const metadata: Metadata = {
  title: "My Journal | Kelana AI",
  description: "Keep travel photos, personal stories, and notes together.",
};

export default function JournalLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
