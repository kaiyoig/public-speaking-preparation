"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorView, errorMessage } from "@/components/AsyncView";
import { CameraPlaceholder } from "@/components/CameraPlaceholder";
import { Host, useHost } from "@/components/Host";
import { QuitButton } from "@/components/QuitButton";
import { useSpeechCapture } from "@/components/useSpeechCapture";
import { OVERTIME_GRACE_SECONDS } from "@/domain/config";
import type { Mode, Recording } from "@/domain/types";
import { services } from "@/services";

interface DeliveryProps {
  mode: Mode;
  timeLimitSeconds: number;
  /** Shown beside the Host, e.g. the Speaking Points in Improv Mode. */
  sidePanel?: ReactNode;
  onFinished: (recording: Recording) => void;
  onQuit: () => void;
}

type DeliveryState =
  | { status: "ready" }
  | { status: "starting" }
  | { status: "speaking"; startedAt: number }
  | { status: "ending"; elapsedSeconds: number };

type AsyncStatus = { status: "pending" } | { status: "done" } | { status: "error"; message: string };

/** The Delivery Phase, shared by both Modes: the Speaker gives their speech. */
export function Delivery({ mode, timeLimitSeconds, sidePanel, onFinished, onQuit }: DeliveryProps) {
  const { caption, isSpeaking, say } = useHost();
  const capture = useSpeechCapture();
  const [state, setState] = useState<DeliveryState>({ status: "ready" });
  const [now, setNow] = useState(() => Date.now());
  const [greeting, setGreeting] = useState<AsyncStatus>({ status: "pending" });
  const [greetingAttempt, setGreetingAttempt] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  const ending = useRef(false);

  // ready: fetch the greeting Formality and have the Host say it.
  useEffect(() => {
    let cancelled = false;
    setGreeting({ status: "pending" });
    services.hostBrain.getFormality("greeting", mode).then(
      (line) => {
        if (cancelled) return;
        setGreeting({ status: "done" });
        void say(line);
      },
      (error: unknown) => {
        if (!cancelled) setGreeting({ status: "error", message: errorMessage(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode, say, greetingAttempt]);

  const startSpeech = async () => {
    setStartError(null);
    setState({ status: "starting" });
    try {
      await capture.start();
      const startedAt = Date.now();
      setNow(startedAt);
      setState({ status: "speaking", startedAt });
    } catch (error) {
      setStartError(errorMessage(error));
      setState({ status: "ready" });
    }
  };

  const stopCapture = useCallback(async () => {
    setStopError(null);
    try {
      onFinished(await capture.stop());
    } catch (error) {
      setStopError(errorMessage(error));
    }
  }, [capture, onFinished]);

  const endSpeech = useCallback(
    (startedAt: number) => {
      if (ending.current) return;
      ending.current = true;
      setState({ status: "ending", elapsedSeconds: (Date.now() - startedAt) / 1000 });
      void stopCapture();
    },
    [stopCapture],
  );

  // speaking: tick the clock. Time is derived from timestamps, so it doesn't drift.
  useEffect(() => {
    if (state.status !== "speaking") return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [state.status]);

  const elapsedSeconds =
    state.status === "speaking"
      ? Math.max(0, (now - state.startedAt) / 1000)
      : state.status === "ending"
        ? state.elapsedSeconds
        : 0;
  const remainingSeconds = timeLimitSeconds - elapsedSeconds;
  const overtimeSeconds = Math.max(0, -remainingSeconds);
  const inOvertime = state.status !== "ready" && state.status !== "starting" && remainingSeconds <= 0;
  const graceLeftSeconds = Math.max(0, Math.ceil(OVERTIME_GRACE_SECONDS - overtimeSeconds));

  // End automatically once the Overtime grace period runs out.
  useEffect(() => {
    if (state.status === "speaking" && overtimeSeconds >= OVERTIME_GRACE_SECONDS) endSpeech(state.startedAt);
  }, [state, overtimeSeconds, endSpeech]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <CameraPlaceholder live={state.status === "speaking"} />

        <section
          aria-label="Live Transcript"
          className="card flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Live Transcript
            </h2>
            {state.status === "speaking" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span className="size-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
                Listening…
              </span>
            )}
          </div>
          <p
            aria-live="polite"
            className="max-h-40 min-h-16 overflow-y-auto whitespace-pre-wrap text-base leading-relaxed text-neutral-800 dark:text-neutral-200"
          >
            {capture.liveTranscript || (
              <span className="text-neutral-400 dark:text-neutral-500">
                {state.status === "speaking"
                  ? "Speak into your microphone — your words will stream here in real time…"
                  : 'Press "Start speech" to begin capturing your microphone.'}
              </span>
            )}
          </p>
        </section>

        {inOvertime && state.status === "speaking" && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            You're over the Time Limit. Delivery will end automatically in {graceLeftSeconds}s.
          </div>
        )}

        {startError && <ErrorView compact message={startError} onRetry={startSpeech} />}
        {stopError && <ErrorView compact message={stopError} onRetry={stopCapture} />}

        <div className="flex flex-wrap items-center gap-3">
          {(state.status === "ready" || state.status === "starting") && (
            <button
              type="button"
              onClick={startSpeech}
              disabled={state.status === "starting" || isSpeaking || greeting.status === "pending"}
              className="btn-primary"
            >
              {state.status === "starting" ? "Starting…" : "Start speech"}
            </button>
          )}
          {state.status === "speaking" && (
            <button type="button" onClick={() => endSpeech(state.startedAt)} className="btn-primary">
              End speech
            </button>
          )}
          {state.status === "ending" && !stopError && (
            <span role="status" className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-indigo-600 dark:border-neutral-700 dark:border-t-indigo-400"
              />
              Wrapping up…
            </span>
          )}
          {state.status !== "ending" && (
            <span className="ml-auto">
              <QuitButton onQuit={onQuit} />
            </span>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <Timer
          label={inOvertime ? "Overtime" : state.status === "ready" || state.status === "starting" ? "Time Limit" : "Time left"}
          value={inOvertime ? `+${formatClock(overtimeSeconds, "floor")}` : formatClock(remainingSeconds, "ceil")}
          warning={inOvertime}
        />
        <Host caption={caption} isSpeaking={isSpeaking} />
        {greeting.status === "error" && (
          <ErrorView compact message={greeting.message} onRetry={() => setGreetingAttempt((n) => n + 1)} />
        )}
        {sidePanel}
      </aside>
    </div>
  );
}

function Timer({ label, value, warning }: { label: string; value: string; warning: boolean }) {
  return (
    <section
      aria-label="Timer"
      className={`card text-center transition-colors ${
        warning ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950" : ""
      }`}
    >
      <p
        className={`text-sm font-medium ${
          warning ? "text-amber-800 dark:text-amber-300" : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-5xl font-semibold tabular-nums tracking-tight ${
          warning ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
    </section>
  );
}

/** Formats seconds as m:ss. */
function formatClock(seconds: number, rounding: "ceil" | "floor"): string {
  const whole = Math.max(0, rounding === "ceil" ? Math.ceil(seconds) : Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
