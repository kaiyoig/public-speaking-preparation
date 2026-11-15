"use client";

import { useState } from "react";
import { AsyncView } from "@/components/AsyncView";
import { IMPROV_TIME_LIMIT_SECONDS } from "@/domain/config";
import type { TopicBriefing, TopicKind } from "@/domain/types";
import { services } from "@/services";

const LOADING_LABEL: Record<TopicKind, string> = {
  classic: "Researching a fresh topic…",
  trending: "Searching the news for a trending topic…",
};

const TOPIC_LABEL: Record<TopicKind, string> = {
  classic: "Your topic",
  trending: "Trending topic",
};

interface TopicBriefingViewProps {
  /** Where the topic comes from, as the Speaker chose just before. */
  kind: TopicKind;
  onStart: (topicBriefing: TopicBriefing) => void;
  /** Back to choosing the kind of topic. */
  onChangeKind: () => void;
}

/** Improv Mode Briefing: fetches a Topic Briefing of the kind chosen in Setup and shows it before Delivery. */
export function TopicBriefingView({ kind, onStart, onChangeKind }: TopicBriefingViewProps) {
  const [attempt, setAttempt] = useState(0);
  const changeKind = (
    <button type="button" onClick={onChangeKind} className="btn-secondary">
      Change kind
    </button>
  );

  return (
    <AsyncView
      key={attempt}
      run={() => services.topicSource.getTopicBriefing(kind)}
      label={LOADING_LABEL[kind]}
      errorActions={changeKind}
    >
      {(topicBriefing) => (
        <div className="pt-3 flex flex-col gap-9">
          <div className="hang-row lg:items-baseline">
            <p className="hang-label">{TOPIC_LABEL[kind]}</p>
            <h2 className="hang-body text-5xl font-bold leading-[0.95] tracking-tight font-display sm:text-6xl">
              {topicBriefing.topic}
            </h2>
          </div>

          <div className="hang-row">
            <h3 className="hang-label">Speaking Points</h3>
            <SpeakingPointsList speakingPoints={topicBriefing.speakingPoints} className="hang-body max-w-2xl text-lg" />
          </div>

          {topicBriefing.sources && topicBriefing.sources.length > 0 && (
            <div className="hang-row">
              <p className="hang-label">Sources</p>
              <ul className="hang-body flex max-w-2xl flex-col gap-1 text-lg">
                {topicBriefing.sources.map((source) => (
                  <li key={source.url} className="truncate">
                    <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:bg-highlight hover:text-on-highlight">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="hang-row">
            <p className="hang-label">Time Limit</p>
            <p className="hang-body text-lg">{formatMinutes(IMPROV_TIME_LIMIT_SECONDS)}</p>
          </div>

          <div className="hang-row">
            <div className="hang-body flex flex-wrap items-center gap-3 lg:col-start-3">
              <button type="button" onClick={() => onStart(topicBriefing)} className="btn-primary">
                Start
              </button>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-secondary">
                New topic
              </button>
              {changeKind}
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
