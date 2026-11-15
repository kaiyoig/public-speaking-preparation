import Link from "next/link";
import { HomePanelLink } from "@/components/HomePager";
import { PageTransition } from "@/components/PageTransition";
import { Shell } from "@/components/Shell";
import type { PracticeSessionSummary } from "@/domain/types";
import { listPracticeSessions } from "@/src/db";

export const dynamic = "force-dynamic";

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatWpmDelta(
  current: PracticeSessionSummary,
  previous: PracticeSessionSummary | undefined
): string | null {
  const currWpm = current.vocalMetrics?.wordsPerMinute;
  const prevWpm = previous?.vocalMetrics?.wordsPerMinute;
  if (currWpm == null || prevWpm == null) return null;
  const delta = currWpm - prevWpm;
  if (delta === 0) return "same pace as prior";
  return delta > 0 ? `+${delta} WPM vs prior` : `${delta} WPM vs prior`;
}

export default async function HistoryPage() {
  const sessions = await listPracticeSessions(30);

  return (
    <PageTransition>
      <Shell
        rail={
          <nav aria-label="History navigation" className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col">
            <HomePanelLink panel="modes" className="text-link self-start text-lg">
              Choose a mode
            </HomePanelLink>
            <Link href="/about" className="text-link self-start text-lg">
              About Rhetor
            </Link>
          </nav>
        }
      >
        <div className="flex flex-col gap-12">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-5xl font-bold leading-[0.9] tracking-tight font-display sm:text-6xl">
              History.
            </h1>
            <p className="text-base text-mute">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"} recorded
            </p>
          </header>

          {sessions.length === 0 ? (
            <section className="rule-top hang-row">
              <h2 className="hang-label">No sessions yet</h2>
              <p className="hang-body max-w-xl text-xl leading-relaxed">
                Complete a Normal or Improv Mode rehearsal and your spoken reflection, vocal delivery metrics, and
                transcript will appear here.
              </p>
            </section>
          ) : (
            <ol className="flex flex-col">
              {sessions.map((session, idx) => {
                const previous = sessions[idx + 1];
                const wpmDelta = formatWpmDelta(session, previous);
                const modeLabel = session.mode === "normal" ? "Normal Mode" : "Improv Mode";
                const m = session.vocalMetrics;

                return (
                  <li key={session.id} className="rule-top hang-row group">
                    <div className="hang-label flex flex-col gap-1">
                      <span className="text-ink">{modeLabel}</span>
                      <time dateTime={session.createdAt} className="font-normal text-mute">
                        {formatSessionDate(session.createdAt)}
                      </time>
                      {session.purpose && session.purpose !== "improv" && (
                        <span className="font-normal capitalize text-mute">
                          Purpose: {session.purpose}
                        </span>
                      )}
                    </div>

                    <div className="hang-body flex flex-col gap-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h2 className="text-2xl font-bold tracking-tight font-display sm:text-3xl">
                          <Link
                            href={`/history/${session.id}`}
                            className="underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-ink hover:bg-highlight hover:text-on-highlight"
                          >
                            {session.topicOrAudience}
                          </Link>
                        </h2>
                        <Link
                          href={`/history/${session.id}`}
                          className="text-link shrink-0 text-base"
                        >
                          Open reflection →
                        </Link>
                      </div>

                      <p className="max-w-2xl text-lg leading-snug text-ink/90">
                        {session.reflection.summary}
                      </p>

                      {m && (
                        <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/15 pt-3 text-sm text-mute">
                          <div>
                            <dt className="inline font-semibold text-ink">{m.wordsPerMinute} WPM</dt>{" "}
                            <dd className="inline">
                              ({m.paceLabel}
                              {wpmDelta ? ` · ${wpmDelta}` : ""})
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-ink">Inflection:</dt>{" "}
                            <dd className="inline capitalize">{m.inflectionVariety}</dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-ink">Volume:</dt>{" "}
                            <dd className="inline capitalize">
                              {m.volumeLevel} / {m.volumeDynamics}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold text-ink">Fillers:</dt>{" "}
                            <dd className="inline">{m.fillerWordCount}</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Shell>
    </PageTransition>
  );
}
