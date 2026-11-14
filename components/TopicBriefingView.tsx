"use client";

import { AsyncView } from "@/components/AsyncView";
import { IMPROV_TIME_LIMIT_SECONDS } from "@/domain/config";
import type { TopicBriefing } from "@/domain/types";
import { services } from "@/services";

interface TopicBriefingViewProps {
  onStart: (topicBriefing: TopicBriefing) => void;
}

/** Improv Mode Setup: fetches a random Topic Briefing and shows it before Delivery. */
export function TopicBriefingView({ onStart }: TopicBriefingViewProps) {
  return (
    <AsyncView run={() => services.topicSource.getTopicBriefing()} label="Choosing a topic…">
      {(topicBriefing) => (
        <div className="card flex flex-col gap-6 p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Your topic
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{topicBriefing.topic}</h2>
          </div>

          <div>
            <h3 className="font-medium">Speaking Points</h3>
            <SpeakingPointsList speakingPoints={topicBriefing.speakingPoints} className="mt-3" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <p className="text-neutral-600 dark:text-neutral-400">
              Time Limit: <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatMinutes(IMPROV_TIME_LIMIT_SECONDS)}</span>
            </p>
            <button type="button" onClick={() => onStart(topicBriefing)} className="btn-primary">
              Start
            </button>
          </div>
        </div>
      )}
    </AsyncView>
  );
}

export function SpeakingPointsList({ speakingPoints, className = "" }: { speakingPoints: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`}>
      {speakingPoints.map((point) => (
        <li key={point} className="flex gap-3 text-neutral-700 dark:text-neutral-300">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
