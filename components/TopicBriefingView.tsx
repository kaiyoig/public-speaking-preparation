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
        <div className="rule-top flex flex-col gap-9">
          <div className="hang-row lg:items-baseline">
            <p className="hang-label">Your topic</p>
            <h2 className="hang-body text-5xl font-bold leading-[0.95] tracking-tight font-display sm:text-6xl">
              <span className="bg-highlight box-decoration-clone px-[0.12em] text-on-highlight">{topicBriefing.topic}</span>
            </h2>
          </div>

          <div className="hang-row">
            <h3 className="hang-label">Speaking Points</h3>
            <SpeakingPointsList speakingPoints={topicBriefing.speakingPoints} className="hang-body max-w-2xl text-lg" />
          </div>

          <div className="hang-row">
            <p className="hang-label">Time Limit</p>
            <p className="hang-body text-lg">{formatMinutes(IMPROV_TIME_LIMIT_SECONDS)}</p>
          </div>

          <div className="hang-row">
            <div className="hang-body lg:col-start-3">
              <button type="button" onClick={() => onStart(topicBriefing)} className="btn-primary">
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </AsyncView>
  );
}

export function SpeakingPointsList({ speakingPoints, className = "" }: { speakingPoints: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-3 leading-snug ${className}`}>
      {speakingPoints.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  );
}

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
