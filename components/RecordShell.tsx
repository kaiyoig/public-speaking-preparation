import Link from "next/link";
import type { ReactNode } from "react";
import { HomePanelLink } from "@/components/HomePager";
import { PageTransition } from "@/components/PageTransition";
import { Shell } from "@/components/Shell";
import { TRANSITION } from "@/components/transitions";

/** The page around a session record from History, shared by the record and its loading screen. */
export function RecordShell({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <Shell
        wordmarkTransition={TRANSITION.historyToTitle}
        rail={
          <nav aria-label="Session detail navigation" className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col">
            <Link href="/history" transitionTypes={[TRANSITION.closeRecord]} className="text-link self-start text-lg">
              ← All history
            </Link>
            <HomePanelLink
              panel="modes"
              transitionTypes={[TRANSITION.historyToModes]}
              className="text-link self-start text-lg"
            >
              Choose a mode
            </HomePanelLink>
          </nav>
        }
      >
        {children}
      </Shell>
    </PageTransition>
  );
}
