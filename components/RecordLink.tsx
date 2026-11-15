"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { holdUntilNavigated } from "@/components/loadingHolds";
import { TRANSITION } from "@/components/transitions";

/** A link from History to one session record, holding the loading screen over History while it loads. */
export function RecordLink({ id, className, children }: { id: number; className?: string; children: ReactNode }) {
  return (
    <Link
      href={`/history/${id}`}
      transitionTypes={[TRANSITION.openRecord]}
      onNavigate={() => holdUntilNavigated("Opening your reflection…")}
      className={className}
    >
      {children}
    </Link>
  );
}
