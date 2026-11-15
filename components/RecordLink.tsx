"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { holdUntilNavigated } from "@/components/loadingHolds";

/**
 * A link from History to one session record. It puts the loading screen up at once and opens the
 * record only once the screen covers History, so the screen plays however quickly the record loads.
 */
export function RecordLink({ id, className, children }: { id: number; className?: string; children: ReactNode }) {
  const router = useRouter();
  const href = `/history/${id}`;
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        event.preventDefault();
        // No page transition: its snapshots would be drawn over the screen, and the record arrives
        // under the screen anyway.
        void holdUntilNavigated("Opening your reflection…").then(() => router.push(href));
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
