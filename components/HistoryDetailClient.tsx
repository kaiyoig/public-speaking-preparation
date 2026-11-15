"use client";

import { ReflectionView } from "@/components/Reflection";
import type { PracticeSessionDetail } from "@/domain/types";

export function HistoryDetailClient({ session }: { session: PracticeSessionDetail }) {
  return (
    <div className="flex flex-col gap-14">
      <ReflectionView
        reflection={session.reflection}
        vocalMetrics={session.vocalMetrics ?? undefined}
        showHistoryLink={false}
      />

      {session.deliveryTranscript.trim().length > 0 && (
        <section aria-label="Delivery Transcript" className="rule-top hang-row">
          <h3 className="hang-label">Delivery Transcript</h3>
          <p className="hang-body max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-ink/90">
            {session.deliveryTranscript}
          </p>
        </section>
      )}

      {session.qaAnswers && session.qaAnswers.length > 0 && (
        <section aria-label="Q&A Responses" className="rule-top hang-row">
          <h3 className="hang-label">Q&amp;A Responses</h3>
          <ol className="hang-body flex max-w-2xl flex-col gap-4 text-lg leading-relaxed">
            {session.qaAnswers.map((answer, index) => (
              <li key={index} className="border-b border-ink/15 pb-3 last:border-b-0 last:pb-0">
                <span className="mr-2 font-semibold text-mute">Q{index + 1}.</span>
                <span>{answer || "No spoken answer recorded."}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
