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
    <AsyncView run={() => services.hostBrain.getReflection(input)} label="The host is writing your reflection…">
      {(reflection) => (
        <ReflectionView
          reflection={reflection}
          vocalMetrics={input.delivery.vocalMetrics}
          onPracticeAgain={onPracticeAgain}
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
  onPracticeAgain,
}: {
  reflection: ReflectionData;
  vocalMetrics?: VocalDeliveryMetrics | undefined;
  onPracticeAgain: () => void;
}) {
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

      {vocalMetrics && <VocalMetricsRow metrics={vocalMetrics} />}

      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <ReflectionSectionRow key={section.key} title={section.title} section={reflection[section.key]} />
        ))}
      </div>

      {reflection.sources && reflection.sources.length > 0 && (
        <section aria-label="Helpful Sources" className="rule-top hang-row">
          <h3 className="text-3xl font-bold leading-[0.95] tracking-tight font-display lg:col-span-2">Sources</h3>
          <div className="hang-body mt-2 lg:mt-0">
            <p className="text-lg">Helpful for your next draft.</p>
            <ul className="mt-3 flex max-w-2xl flex-col gap-1 text-lg">
              {reflection.sources.map((source) => (
                <li key={source.url} className="truncate">
                  <a href={source.url} target="_blank" rel="noreferrer" className="text-link">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onPracticeAgain} className="btn-primary">
          Practice again
        </button>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}

/** Pace, inflection, volume and pauses measured from the Speaker's voice during Delivery. */
function VocalMetricsRow({ metrics }: { metrics: VocalDeliveryMetrics }) {
  const stats = [
    { label: "Pace", value: `${metrics.wordsPerMinute} WPM · ${metrics.paceLabel}` },
    { label: "Inflection", value: `${metrics.inflectionVariety} (±${metrics.pitchRangeHz} Hz)` },
    { label: "Volume", value: `${metrics.volumeLevel} · ${metrics.volumeDynamics}` },
    { label: "Pauses & Fillers", value: `${metrics.pauseCount} pauses · ${metrics.fillerWordCount} fillers` },
  ];
  return (
    <section aria-label="Vocal Delivery" className="rule-top hang-row">
      <h3 className="text-3xl font-bold leading-[0.95] tracking-tight font-display lg:col-span-2">Your Voice</h3>
      <dl className="hang-body mt-2 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:mt-0 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="font-bold">{stat.label}</dt>
            <dd className="mt-1 text-xl first-letter:uppercase tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One Reflection section: its title hanging left, Strengths and Improvements side by side. */
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

/** Strengths are marked green and Improvements blue, so each kind reads the same down the page. */
const LIST_KINDS = {
  strengths: { title: "Strengths", mark: "bg-strength" },
  improvements: { title: "Improvements", mark: "bg-improvement" },
} as const;

/** A list under a heavy ink rule, each point marked with a small square in its kind's color. */
function ReflectionList({ kind, items }: { kind: keyof typeof LIST_KINDS; items: string[] }) {
  const style = LIST_KINDS[kind];
  return (
    <div className="rule-top">
      <h4 className="font-bold">{style.title}</h4>
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
