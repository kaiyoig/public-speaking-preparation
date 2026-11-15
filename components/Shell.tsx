import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";

interface ShellProps {
  /** What orients the Speaker: the Mode name and Phase list, or a short intro on Home. */
  rail?: ReactNode;
  /** False mid-Session, so the wordmark can't skip the Quit confirmation. */
  wordmarkLinksHome?: boolean;
  /** Delivery: a narrower rail and tighter margins, so the working parts get the room and fit on one screen. */
  dense?: boolean;
  children: ReactNode;
}

const WORDMARK_CLASS = "block text-[1.75rem] font-bold leading-[0.92] tracking-tight font-display";

/**
 * The page grid: a 3-column rail and a 9-column content field on large screens
 * (2 and 10 when dense), collapsing to a top band with the content below on small ones.
 */
export function Shell({ rail, wordmarkLinksHome = true, dense = false, children }: ShellProps) {
  const wordmark = <Wordmark />;

  return (
    <div
      className={`mx-auto grid min-h-screen w-full grid-cols-4 gap-x-6 lg:grid-cols-12 lg:gap-x-8 ${
        dense ? "max-w-[1600px] px-6 sm:px-8 lg:px-10" : "max-w-[1280px] px-6 sm:px-12 lg:px-24"
      }`}
    >
      <header
        className={`col-span-4 flex flex-wrap items-start justify-between gap-x-10 gap-y-6 pt-5 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:flex-nowrap lg:justify-start ${
          dense ? "lg:col-span-2 lg:gap-10 lg:py-10" : "lg:col-span-3 lg:gap-14 lg:py-20"
        }`}
      >
        {wordmarkLinksHome ? (
          <Link href="/" className={`${WORDMARK_CLASS} hover:text-mute`}>
            {wordmark}
          </Link>
        ) : (
          <p className={WORDMARK_CLASS}>{wordmark}</p>
        )}
        {rail}
      </header>
      <main className={`col-span-4 flex flex-col py-8 ${dense ? "lg:col-span-10 lg:py-10" : "lg:col-span-9 lg:py-20"}`}>{children}</main>
    </div>
  );
}

/** The rail during a Session: the Mode name above the numbered Phases. */
export function SessionRail({ mode, children }: { mode: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-4xl font-bold leading-[0.9] tracking-tight font-display">{mode}</h1>
      {children}
    </div>
  );
}
