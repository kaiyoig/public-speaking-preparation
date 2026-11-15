"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorView, errorMessage } from "@/components/AsyncView";
import { Host, useHost } from "@/components/Host";
import { QuitButton } from "@/components/QuitButton";
import WebcamViewer from "@/app/components/WebcamViewer";
import type { YuNetDetector } from "@/app/components/YuNetLoader";
import { ExpressionRecord, summarizeExpressionRecord } from "@/app/data/ExpressionRecord";
import {
  createMobileFaceNetExpressionProxy,
  type FacialExpressionProxy,
} from "@/app/data/FacialExpression";
import type { WebcamData } from "@/app/data/WebcamData";
import { useOpenCv } from "@/app/hooks/useOpenCv";
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
  const [timerShown, setTimerShown] = useState(true);
  const [cameraShown, setCameraShown] = useState(true);
  const ending = useRef(false);

  // OpenCV YuNet gaze & MobileFaceNet facial expression tracking during Delivery
  const cv = useOpenCv();
  const [webcamData, setWebcamData] = useState<WebcamData | undefined>(undefined);
  const [detector, setDetector] = useState<YuNetDetector | undefined>(undefined);
  const [emotionProxy, setEmotionProxy] = useState<FacialExpressionProxy | undefined>(undefined);
  const expressionRecordRef = useRef<ExpressionRecord | null>(null);
  if (!expressionRecordRef.current) {
    expressionRecordRef.current = new ExpressionRecord(1500);
  }

  const handleWebcamData = useCallback((data: WebcamData) => {
    setWebcamData(data);
  }, []);

  const handleDetector = useCallback((nextDetector: YuNetDetector | undefined) => {
    setDetector(nextDetector);
  }, []);

  useEffect(() => {
    if (!cv) return;
    let cancelled = false;
    createMobileFaceNetExpressionProxy(cv)
      .then((proxy) => {
        if (!cancelled) {
          setEmotionProxy(proxy);
          expressionRecordRef.current?.setEmotionProxy(proxy);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("MobileFaceNet expression model failed to load:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [cv]);

  useEffect(() => {
    const record = expressionRecordRef.current;
    if (!record) return;
    if (state.status !== "speaking") {
      if (record.isRecording()) record.stop();
      return;
    }
    if (!cv || !webcamData || !detector) return;
    if (!record.isRecording()) {
      record.start({
        cv,
        video: webcamData.video,
        detector,
        emotionProxy,
      });
    }
  }, [state.status, cv, webcamData, detector, emotionProxy]);

  useEffect(() => {
    return () => {
      expressionRecordRef.current?.stop();
    };
  }, []);

  // ready: fetch the greeting Formality and have the Host say it.
  useEffect(() => {
    let canceled = false;
    setGreeting({ status: "pending" });
    services.hostBrain.getFormality("greeting", mode).then(
      (line) => {
        if (canceled) return;
        setGreeting({ status: "done" });
        void say(line);
      },
      (error: unknown) => {
        if (!canceled) setGreeting({ status: "error", message: errorMessage(error) });
      },
    );
    return () => {
      canceled = true;
    };
  }, [mode, say, greetingAttempt]);

  const startSpeech = async () => {
    setStartError(null);
    setState({ status: "starting" });
    expressionRecordRef.current?.clear();
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
    expressionRecordRef.current?.stop();
    try {
      const recording = await capture.stop();
      const openCvObservations = summarizeExpressionRecord(
        expressionRecordRef.current?.getEntries() ?? [],
      );
      if (openCvObservations.length > 0) {
        recording.bodyLanguageObservations = [
          ...recording.bodyLanguageObservations,
          ...openCvObservations,
        ];
      }
      onFinished(recording);
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
    <div className="flex flex-col gap-5">
      <Timer
        shown={timerShown}
        label={inOvertime ? "Overtime" : state.status === "ready" || state.status === "starting" ? "Time Limit" : "Time left"}
        value={inOvertime ? `+${formatClock(overtimeSeconds, "floor")}` : formatClock(remainingSeconds, "ceil")}
        warning={inOvertime}
        note={
          inOvertime && state.status === "speaking" ? (
            <p role="status" className="text-lg font-semibold">
              You're over the Time Limit. Delivery will end automatically in {graceLeftSeconds}s.
            </p>
          ) : null
        }
        toggles={
          <>
            <ToggleButton shown={timerShown} onToggle={setTimerShown}>
              timer
            </ToggleButton>
            <ToggleButton shown={cameraShown} onToggle={setCameraShown}>
              camera
            </ToggleButton>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WebcamViewer
            onWebcamData={handleWebcamData}
            onDetector={handleDetector}
            hidden={!cameraShown}
            className="aspect-video lg:aspect-auto lg:h-[clamp(14rem,45vh,34rem)]"
          />

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
              <span role="status" className="text-lg">
                Wrapping up…
              </span>
            )}
            {state.status !== "ending" && (
              <span className="ml-auto">
                <QuitButton onQuit={onQuit} />
              </span>
            )}
          </div>

          {startError && <ErrorView compact message={startError} onRetry={startSpeech} />}
          {stopError && <ErrorView compact message={stopError} onRetry={stopCapture} />}

          <section aria-label="Live Transcript" className="rule-top flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">Live Transcript</h2>
              {state.status === "speaking" && (
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span aria-hidden className="live-mark" />
                  Listening…
                </span>
              )}
            </div>
            <p aria-live="polite" className="max-h-40 min-h-16 overflow-y-auto whitespace-pre-wrap text-lg">
              {capture.liveTranscript || (
                <span className="text-mute">
                  {state.status === "speaking"
                    ? "Speak into your microphone — your words will stream here in real time…"
                    : 'Press "Start speech" to begin capturing your microphone.'}
                </span>
              )}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <Host caption={caption} isSpeaking={isSpeaking} />
          {greeting.status === "error" && (
            <ErrorView compact message={greeting.message} onRetry={() => setGreetingAttempt((n) => n + 1)} />
          )}
          {sidePanel}
        </aside>
      </div>
    </div>
  );
}

interface TimerProps {
  /** False when the Speaker has hidden it. The bar stays for its toggles and the Overtime warning. */
  shown: boolean;
  label: string;
  value: string;
  /** Overtime: the whole bar turns signal red, hidden or not. */
  warning: boolean;
  note: ReactNode;
  toggles: ReactNode;
}

/** A bar across the top of Delivery: the time on the left, the show and hide toggles on the right. */
function Timer({ shown, label, value, warning, note, toggles }: TimerProps) {
  return (
    <section
      aria-label="Timer"
      className={`flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t-2 pt-3 pb-3 ${
        // In Overtime the red bleeds into the gutter so the numerals don't move.
        warning ? "-mx-4 border-signal bg-signal px-4 text-white sm:-mx-5 sm:px-5" : "border-ink"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        {shown && (
          <p className="flex items-baseline gap-4">
            <span className="text-lg font-bold">{label}</span>
            <span className="text-5xl font-bold leading-none tracking-[-0.03em] tabular-nums font-display">
              {value}
            </span>
          </p>
        )}
        {note}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">{toggles}</div>
    </section>
  );
}

/** "Hide timer" / "Show timer" and the like: names what pressing it will do. */
function ToggleButton({
  shown,
  onToggle,
  children,
}: {
  shown: boolean;
  onToggle: (shown: boolean) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!shown)}
      className="min-h-10 text-lg font-semibold underline decoration-2 underline-offset-4 hover:bg-highlight hover:text-on-highlight"
    >
      {shown ? "Hide" : "Show"} {children}
    </button>
  );
}

/** Formats seconds as m:ss. */
function formatClock(seconds: number, rounding: "ceil" | "floor"): string {
  const whole = Math.max(0, rounding === "ceil" ? Math.ceil(seconds) : Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
