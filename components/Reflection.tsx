"use client";

import Link from "next/link";
import { AsyncView } from "@/components/AsyncView";
import { Host, useHost } from "@/components/Host";
import type {
  Reflection as ReflectionData,
  ReflectionSection,
  VocalDeliveryMetrics,
} from "@/domain/types";
import { services, type ReflectionInput } from "@/services";

interface ReflectionProps {
  input: ReflectionInput;
  onPractiseAgain: () => void;
}

/** The Reflection Phase, shared by both Modes: what the Speaker can improve. No numeric scores. */
export function Reflection({ input, onPractiseAgain }: ReflectionProps) {
  return (
    <AsyncView run={() => services.hostBrain.getReflection(input)} label="The Host is writing your Reflection…">
      {(reflection) => (
        <ReflectionView
          reflection={reflection}
          vocalMetrics={input.delivery.vocalMetrics}
          onPractiseAgain={onPractiseAgain}
        />
      )}
    </AsyncView>
  );
}

const SECTIONS = [
  { key: "bodyLanguage", title: "Body Language" },
  { key: "voiceAndDelivery", title: "Voice & Delivery" },
  { key: "content", title: "Content" },
] as const;

function ReflectionView({
  reflection,
  vocalMetrics,
  onPractiseAgain,
}: {
  reflection: ReflectionData;
  vocalMetrics?: VocalDeliveryMetrics | undefined;
  onPractiseAgain: () => void;
}) {
  const { caption, isSpeaking, say } = useHost();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="reflection-summary" className="card p-8">
          <h2 id="reflection-summary" className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Reflection
          </h2>
          <p className="mt-2 text-xl leading-relaxed">{reflection.summary}</p>
        </section>
        <div className="flex flex-col gap-4">
          <Host caption={caption} isSpeaking={isSpeaking} placeholder='Press "Play Reflection" to hear it.' />
          <button
            type="button"
            onClick={() => void say(reflection.summary).catch(() => {})}
            disabled={isSpeaking}
            className="btn-secondary"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.1-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
            </svg>
            {isSpeaking ? "Playing…" : "Play Reflection"}
          </button>
        </div>
      </div>

      {vocalMetrics && (
        <section aria-label="Vocal Delivery Analysis" className="card">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Vocal Delivery Telemetry (ElevenLabs STT + Acoustic Analysis)
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Pace</p>
              <p className="mt-0.5 text-lg font-semibold capitalize">
                {vocalMetrics.wordsPerMinute} WPM · {vocalMetrics.paceLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Vocal Inflection</p>
              <p className="mt-0.5 text-lg font-semibold capitalize">
                {vocalMetrics.inflectionVariety} (±{vocalMetrics.pitchRangeHz} Hz)
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Volume &amp; Dynamics</p>
              <p className="mt-0.5 text-lg font-semibold capitalize">
                {vocalMetrics.volumeLevel} · {vocalMetrics.volumeDynamics}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Pauses &amp; Fillers</p>
              <p className="mt-0.5 text-lg font-semibold">
                {vocalMetrics.pauseCount} pauses · {vocalMetrics.fillerWordCount} fillers
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <ReflectionSectionCard key={section.key} title={section.title} section={reflection[section.key]} />
        ))}
      </div>

      {reflection.sources && reflection.sources.length > 0 && (
        <section aria-label="Helpful Sources" className="card">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Helpful Sources for Your Next Draft
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {reflection.sources.map((source) => (
              <li key={source.url} className="truncate">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/" className="btn-secondary">
          Home
        </Link>
        <button type="button" onClick={onPractiseAgain} className="btn-primary">
          Practise again
        </button>
      </div>
    </div>
  );
}

function ReflectionSectionCard({ title, section }: { title: string; section: ReflectionSection }) {
  return (
    <section aria-label={title} className="card flex flex-col gap-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div>
        <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Strengths</h4>
        <ul className="mt-2 flex flex-col gap-2">
          {section.strengths.map((item) => (
            <li key={item} className="flex gap-2.5 text-neutral-700 dark:text-neutral-300">
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Improvements</h4>
        <ul className="mt-2 flex flex-col gap-2">
          {section.improvements.map((item) => (
            <li key={item} className="flex gap-2.5 text-neutral-700 dark:text-neutral-300">
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-5 shrink-0 text-neutral-400 dark:text-neutral-500">
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 0 1 1-1h9.59l-3.3-3.3a1 1 0 1 1 1.42-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.42-1.4l3.3-3.3H4a1 1 0 0 1-1-1Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
