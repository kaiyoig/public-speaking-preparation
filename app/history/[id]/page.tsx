import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailClient } from "@/components/HistoryDetailClient";
import { HomePanelLink } from "@/components/HomePager";
import { PageTransition } from "@/components/PageTransition";
import { Shell } from "@/components/Shell";
import { getPracticeSessionById } from "@/src/db";

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

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    notFound();
  }

  const session = await getPracticeSessionById(sessionId);
  if (!session) {
    notFound();
  }

  const modeLabel = session.mode === "normal" ? "Normal Mode" : "Improv Mode";

  return (
    <PageTransition>
      <Shell
        rail={
          <nav aria-label="Session detail navigation" className="flex flex-wrap gap-x-6 gap-y-2 lg:flex-col">
            <Link href="/history" className="text-link self-start text-lg">
              ← All history
            </Link>
            <HomePanelLink panel="modes" className="text-link self-start text-lg">
              Choose a mode
            </HomePanelLink>
          </nav>
        }
      >
        <div className="flex flex-col gap-12">
          <header className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-mute">
              {modeLabel} · {formatSessionDate(session.createdAt)}
              {session.purpose && session.purpose !== "improv" ? ` · Purpose: ${session.purpose}` : ""}
            </p>
            <h1 className="text-4xl font-bold leading-[0.95] tracking-tight font-display sm:text-5xl">
              {session.topicOrAudience}
            </h1>
          </header>

          <HistoryDetailClient session={session} />
        </div>
      </Shell>
    </PageTransition>
  );
}
