"use client";

import Link from "next/link";
import {
  addTransitionType,
  startTransition,
  useCallback,
  useEffect,
  useState,
  ViewTransition,
  type ReactNode,
} from "react";
import { AsyncView } from "@/components/AsyncView";
import { Host, useHost } from "@/components/Host";
import { TRANSITION } from "@/components/transitions";
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
          bodyLanguageObservations={input.delivery.bodyLanguageObservations}
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

/** The Reflection runs as slides: the summary, one per section, then everything together. */
const SLIDES = [
  { id: "summary", label: "Summary" },
  ...SECTIONS.map((section) => ({ id: section.key, label: section.title })),
  { id: "overall", label: "Overall" },
] as const;

/** The old slide slides off one way as the next comes in from the other, like turning a page. */
const SLIDE_MOTION = {
  [TRANSITION.slideNext]: TRANSITION.slideNext,
  [TRANSITION.slidePrevious]: TRANSITION.slidePrevious,
  default: "none",
};

export function ReflectionView({
  reflection,
  vocalMetrics,
  bodyLanguageObservations,
  onPracticeAgain,
  showHistoryLink = true,
}: {
  reflection: ReflectionData;
  vocalMetrics?: VocalDeliveryMetrics | undefined;
  bodyLanguageObservations?: string[] | undefined;
  onPracticeAgain?: (() => void) | undefined;
  showHistoryLink?: boolean;
}) {
  const { caption, isSpeaking, say } = useHost();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback(
    (next: number) => {
      if (next === index || next < 0 || next >= SLIDES.length) return;
      startTransition(() => {
        addTransitionType(next > index ? TRANSITION.slideNext : TRANSITION.slidePrevious);
        setIndex(next);
      });
    },
    [index],
  );

  // The arrow keys turn the slides too.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowRight") goTo(index + 1);
      else if (event.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, index]);

  // A new slide starts from its top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  const host = (
    <div className="flex flex-col gap-5">
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
  );

  return (
    <div data-reflection className="flex flex-1 flex-col gap-10">
      <SlideSteps current={index} onSelect={goTo} />

      <ViewTransition key={slide.id} enter={SLIDE_MOTION} exit={SLIDE_MOTION} default="none">
        <div className="flex flex-col gap-14">
          {slide.id === "summary" && (
            <>
              <div className="grid gap-8 lg:grid-cols-9">
                <section aria-labelledby="reflection-summary" className="rule-top lg:col-span-6">
                  <h2 id="reflection-summary" className="text-lg font-bold">
                    Reflection
                  </h2>
                  <p className="mt-4 max-w-[38ch] text-2xl leading-snug sm:text-3xl sm:leading-tight">
                    {reflection.summary}
                  </p>
                </section>
                <div className="lg:col-span-3">{host}</div>
              </div>
              {vocalMetrics && <VocalMetricsRow metrics={vocalMetrics} />}
            </>
          )}

          {SECTIONS.map(
            (section) =>
              slide.id === section.key && (
                <section key={section.key} aria-labelledby={`slide-${section.key}`} className="rule-top">
                  <h2
                    id={`slide-${section.key}`}
                    className="text-5xl font-bold leading-[0.95] tracking-tight font-display sm:text-6xl"
                  >
                    {section.title}
                  </h2>
                  {section.key === "bodyLanguage" &&
                    bodyLanguageObservations &&
                    bodyLanguageObservations.length > 0 && (
                      <div className="mt-8">
                        <BodyLanguageMetricsRow observations={bodyLanguageObservations} />
                      </div>
                    )}
                  <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                    <ReflectionList kind="strengths" items={reflection[section.key].strengths} />
                    <ReflectionList kind="improvements" items={reflection[section.key].improvements} />
                  </div>
                </section>
              ),
          )}

          {slide.id === "overall" && (
            <OverallSummary
              reflection={reflection}
              vocalMetrics={vocalMetrics}
              bodyLanguageObservations={bodyLanguageObservations}
              host={host}
            />
          )}
        </div>
      </ViewTransition>

      <nav aria-label="Reflection slides" className="mt-auto flex flex-wrap items-center gap-3 pt-4">
        {!isFirst && (
          <button type="button" onClick={() => goTo(index - 1)} className="btn-secondary">
            Back
          </button>
        )}
        {isLast ? (
          <>
            {onPracticeAgain ? (
              <button type="button" onClick={onPracticeAgain} className="btn-primary">
                Practice again
              </button>
            ) : (
              <Link href="/#modes" className="btn-primary">
                New practice
              </Link>
            )}
            {showHistoryLink && (
              <Link href="/history" className="btn-secondary">
                History
              </Link>
            )}
            <Link href="/" className="btn-secondary">
              Home
            </Link>
          </>
        ) : (
          <button type="button" onClick={() => goTo(index + 1)} className="btn-primary">
            Next: {SLIDES[index + 1]!.label}
          </button>
        )}
      </nav>
    </div>
  );
}

/** Where the Speaker is in the slides: each one numbered, the current one highlighted. Any can be jumped to. */
function SlideSteps({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  return (
    <ol aria-label="Reflection slides" className="flex flex-wrap gap-x-5 gap-y-1 text-lg">
      {SLIDES.map((slide, index) => {
        const isCurrent = index === current;
        return (
          <li key={slide.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-baseline gap-2.5 hover:text-ink ${isCurrent ? "font-bold text-ink" : "text-mute"}`}
            >
              <span
                className={`w-6 text-center tabular-nums ${isCurrent ? "bg-highlight text-on-highlight" : ""}`}
              >
                {index + 1}
              </span>
              <span>{slide.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The last slide: the summary, the voice, every section and the sources, all on one page. */
function OverallSummary({
  reflection,
  vocalMetrics,
  bodyLanguageObservations,
  host,
}: {
  reflection: ReflectionData;
  vocalMetrics?: VocalDeliveryMetrics | undefined;
  bodyLanguageObservations?: string[] | undefined;
  host: ReactNode;
}) {
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-9">
        <section aria-labelledby="overall-summary" className="rule-top lg:col-span-6">
          <h2 id="overall-summary" className="text-lg font-bold">
            Overall
          </h2>
          <p className="mt-4 max-w-[48ch] text-xl leading-snug sm:text-2xl">{reflection.summary}</p>
        </section>
        <div className="lg:col-span-3">{host}</div>
      </div>

      {vocalMetrics && <VocalMetricsRow metrics={vocalMetrics} />}
      {bodyLanguageObservations && bodyLanguageObservations.length > 0 && (
        <BodyLanguageMetricsRow observations={bodyLanguageObservations} />
      )}

      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section key={section.key} aria-label={section.title} className="rule-top hang-row">
            <h3 className="text-3xl font-bold leading-[0.95] tracking-tight font-display lg:col-span-2">
              {section.title}
            </h3>
            <div className="hang-body mt-2 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-0">
              <ReflectionList kind="strengths" items={reflection[section.key].strengths} compact />
              <ReflectionList kind="improvements" items={reflection[section.key].improvements} compact />
            </div>
          </section>
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

    </>
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

/** Gaze direction, facial expression and camera presence measured via OpenCV during Delivery. */
function BodyLanguageMetricsRow({ observations }: { observations: string[] }) {
  const parsed = observations.map((obs) => {
    const colonIdx = obs.indexOf(":");
    if (colonIdx > 0) {
      return {
        label: obs.slice(0, colonIdx).trim(),
        value: obs.slice(colonIdx + 1).trim(),
      };
    }
    return { label: "Camera Observation", value: obs };
  });

  return (
    <section aria-label="Camera Telemetry" className="rule-top hang-row">
      <h3 className="text-3xl font-bold leading-[0.95] tracking-tight font-display lg:col-span-2">
        OpenCV Camera
      </h3>
      <dl className="hang-body mt-2 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:mt-0">
        {parsed.map((stat, idx) => (
          <div key={`${stat.label}-${idx}`}>
            <dt className="font-bold">{stat.label}</dt>
            <dd className="mt-1 text-lg leading-snug tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Strengths are marked green and Improvements blue, so each kind reads the same on every slide. */
const LIST_KINDS = {
  strengths: { title: "Strengths", mark: "bg-strength" },
  improvements: { title: "Improvements", mark: "bg-improvement" },
} as const;

/**
 * A list, each point marked with a small square in its kind's color. On its own slide it sits under a
 * heavy ink rule; compact, on the Overall slide, it goes without, since its section's rule is just above.
 */
function ReflectionList({
  kind,
  items,
  compact = false,
}: {
  kind: keyof typeof LIST_KINDS;
  items: string[];
  compact?: boolean;
}) {
  const style = LIST_KINDS[kind];
  return (
    <div className={compact ? "" : "rule-top"}>
      <h4 className={`font-bold ${compact ? "" : "text-lg"}`}>{style.title}</h4>
      <ul className={`mt-3 flex flex-col leading-snug ${compact ? "gap-2.5 text-lg" : "gap-4 text-xl sm:text-2xl"}`}>
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
