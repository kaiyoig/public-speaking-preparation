"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { holdUntilNavigated } from "@/components/loadingHolds";
import { TRANSITION } from "@/components/transitions";

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
        void holdUntilNavigated("Opening your reflection…").then(() =>
          router.push(href, { transitionTypes: [TRANSITION.openRecord] }),
        );
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
