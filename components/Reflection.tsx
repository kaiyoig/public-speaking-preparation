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
  onPracticeAgain: () => void;
}

/** The Reflection Phase, shared by both Modes: what the Speaker can improve. No numeric scores. */
export function Reflection({ input, onPracticeAgain }: ReflectionProps) {
  return (
<<<<<<< HEAD
    <AsyncView run={() => services.hostBrain.getReflection(input)} label="The Host is writing your Reflection…">
      {(reflection) => (
        <ReflectionView
          reflection={reflection}
          vocalMetrics={input.delivery.vocalMetrics}
          onPractiseAgain={onPractiseAgain}
        />
      )}
=======
    <AsyncView run={() => services.hostBrain.getReflection(input)} label="The host is writing your reflection…">
      {(reflection) => <ReflectionView reflection={reflection} onPracticeAgain={onPracticeAgain} />}
>>>>>>> 6cc5ef563e0753c7a09cd9fe51d42c7baff30d4c
    </AsyncView>
  );
}

const SECTIONS = [
  { key: "bodyLanguage", title: "Body Language" },
  { key: "voiceAndDelivery", title: "Voice & Delivery" },
  { key: "content", title: "Content" },
] as const;

<<<<<<< HEAD
function ReflectionView({
  reflection,
  vocalMetrics,
  onPractiseAgain,
}: {
  reflection: ReflectionData;
  vocalMetrics?: VocalDeliveryMetrics | undefined;
  onPractiseAgain: () => void;
}) {
=======
function ReflectionView({ reflection, onPracticeAgain }: { reflection: ReflectionData; onPracticeAgain: () => void }) {
>>>>>>> 6cc5ef563e0753c7a09cd9fe51d42c7baff30d4c
  const { caption, isSpeaking, say } = useHost();

  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-8 lg:grid-cols-9">
        <section aria-labelledby="reflection-summary" className="rule-top lg:col-span-6">
          <h2 id="reflection-summary" className="text-lg font-bold">
            Reflection
          </h2>
          <p className="mt-4 max-w-[38ch] text-2xl leading-snug sm:text-3xl sm:leading-tight">{reflection.summary}</p>
        </section>
        <div className="flex flex-col gap-5 lg:col-span-3">
          <Host caption={caption} isSpeaking={isSpeaking} placeholder='Press "Play reflection" to hear it.' />
          <button
            type="button"
            onClick={() => void say(reflection.summary).catch(() => {})}
            disabled={isSpeaking}
            className="btn-secondary self-start"
          >
            {isSpeaking ? "Playing…" : "Play reflection"}
          </button>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      <div className="flex flex-col gap-10">
>>>>>>> 6cc5ef563e0753c7a09cd9fe51d42c7baff30d4c
        {SECTIONS.map((section) => (
          <ReflectionSectionRow key={section.key} title={section.title} section={reflection[section.key]} />
        ))}
      </div>

<<<<<<< HEAD
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
=======
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onPracticeAgain} className="btn-primary">
          Practice again
        </button>
>>>>>>> 6cc5ef563e0753c7a09cd9fe51d42c7baff30d4c
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}

/**
 * One Reflection section: its title hanging left, Strengths and Improvements side by side.
 * Strengths are always green and Improvements always blue, so each kind reads the same down the page.
 */
function ReflectionSectionRow({ title, section }: { title: string; section: ReflectionSection }) {
  return (
    <section aria-label={title} className="rule-top hang-row">
      <h3 className="text-3xl font-bold leading-[0.95] tracking-tight font-display lg:col-span-2">
        {title}
      </h3>
      <div className="hang-body mt-2 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-0">
        <ReflectionList kind="strengths" items={section.strengths} />
        <ReflectionList kind="improvements" items={section.improvements} />
      </div>
    </section>
  );
}

const LIST_STYLES = {
  strengths: { title: "Strengths", block: "border-strength bg-strength-tint", mark: "bg-strength", heading: "text-strength" },
  improvements: {
    title: "Improvements",
    block: "border-improvement bg-improvement-tint",
    mark: "bg-improvement",
    heading: "text-improvement",
  },
} as const;

/** A tinted block under a heavy rule in its kind's color, each point marked with a small square of it. */
function ReflectionList({ kind, items }: { kind: keyof typeof LIST_STYLES; items: string[] }) {
  const style = LIST_STYLES[kind];
  return (
    <div className={`border-t-4 px-4 pt-3 pb-5 sm:px-5 ${style.block}`}>
      <h4 className={`font-bold ${style.heading}`}>{style.title}</h4>
      <ul className="mt-3 flex flex-col gap-2.5 text-lg leading-snug">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-3">
            <span aria-hidden className={`size-2 shrink-0 -translate-y-0.5 ${style.mark}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
