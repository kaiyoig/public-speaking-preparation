import Link from "next/link";
import type { ReactNode } from "react";

interface ShellProps {
  /** What orients the Speaker: the Mode name and Phase list, or a short intro on Home. */
  rail?: ReactNode;
  /** False mid-Session, so the wordmark can't skip the Quit confirmation. */
  wordmarkLinksHome?: boolean;
  children: ReactNode;
}

const WORDMARK_CLASS = "block text-[1.75rem] font-bold leading-[0.92] tracking-tight font-display";

/**
 * The page grid: a 3-column rail and a 9-column content field on large screens,
 * collapsing to a top band with the content below on small ones.
 */
export function Shell({ rail, wordmarkLinksHome = true, children }: ShellProps) {
  const wordmark = "Rhetor";

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-4 gap-x-6 px-4 sm:px-6 lg:grid-cols-12 lg:gap-x-8 lg:px-10">
      <header className="col-span-4 flex flex-wrap items-start justify-between gap-x-10 gap-y-6 pt-5 lg:sticky lg:top-0 lg:col-span-3 lg:h-screen lg:flex-col lg:flex-nowrap lg:justify-start lg:gap-14 lg:py-10">
        {wordmarkLinksHome ? (
          <Link href="/" className={`${WORDMARK_CLASS} hover:text-mute`}>
            {wordmark}
          </Link>
        ) : (
          <p className={WORDMARK_CLASS}>{wordmark}</p>
        )}
        {rail}
      </header>
      <main className="col-span-4 flex flex-col py-8 lg:col-span-9 lg:py-10">{children}</main>
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
