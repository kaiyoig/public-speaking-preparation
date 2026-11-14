"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncView, ErrorView, errorMessage } from "@/components/AsyncView";
import { CameraPlaceholder } from "@/components/CameraPlaceholder";
import { Host, useHost } from "@/components/Host";
import { QuitButton } from "@/components/QuitButton";
import { useSpeechCapture } from "@/components/useSpeechCapture";
import type { Question, Recording, SpeechBrief } from "@/domain/types";
import { services } from "@/services";

interface QandAProps {
  brief: SpeechBrief;
  delivery: Recording;
  onFinished: (answers: Recording[]) => void;
  onQuit: () => void;
}

interface QandAScript {
  questions: Question[];
  closing: string;
}

/** The Q&A Phase (Normal Mode only): the Host asks each Question via ElevenLabs and the Speaker answers aloud. */
export function QandA({ brief, delivery, onFinished, onQuit }: QandAProps) {
  const loadScript = async (): Promise<QandAScript> => {
    const [questions, closing] = await Promise.all([
      services.hostBrain.getQuestions(brief, delivery),
      services.hostBrain.getFormality("closing", "normal"),
    ]);
    return { questions, closing };
  };

  return (
    <AsyncView run={loadScript} label="The Host is preparing Questions…">
      {(script) => <QandASession script={script} onFinished={onFinished} onQuit={onQuit} />}
    </AsyncView>
  );
}

type Step =
  | { kind: "asking"; index: number }
  | { kind: "starting"; index: number }
  | { kind: "answering"; index: number }
  | { kind: "stopping"; index: number }
  | { kind: "closing" }
  | { kind: "finished" };

interface QandASessionProps {
  script: QandAScript;
  onFinished: (answers: Recording[]) => void;
  onQuit: () => void;
}

function QandASession({ script, onFinished, onQuit }: QandASessionProps) {
  const { questions, closing } = script;
  const { caption, isSpeaking, say } = useHost();
  const { start: startCapture, stop: stopCapture, isRunning, liveTranscript } = useSpeechCapture();
  const [step, setStep] = useState<Step>(() =>
    questions.length > 0 ? { kind: "asking", index: 0 } : { kind: "closing" }
  );
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const answers = useRef<Recording[]>([]);
  // Read through a ref so a new callback from the parent doesn't re-run the step effect.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const finish = useCallback(() => {
    setStep({ kind: "finished" });
    onFinishedRef.current(answers.current);
  }, []);

  const beginAnswer = useCallback(
    async (index: number) => {
      setError(null);
      setStep({ kind: "starting", index });
      try {
        await startCapture();
        setStep({ kind: "answering", index });
      } catch (startError) {
        setError({ message: errorMessage(startError), retry: () => void beginAnswer(index) });
      }
    },
    [startCapture],
  );

  // Each Question is spoken by ElevenLabs when its "asking" step begins;
  // once ElevenLabs finishes speaking, microphone capture starts so the user can respond.
  useEffect(() => {
    let cancelled = false;
    const sayThen = (text: string, next: () => void) => {
      setError(null);
      say(text).then(
        () => {
          if (!cancelled) next();
        },
        (speakError: unknown) => {
          if (!cancelled) setError({ message: errorMessage(speakError), retry: () => setStep({ ...step }) });
        },
      );
    };

    if (step.kind === "asking") {
      const question = questions[step.index];
      if (question) {
        sayThen(question.text, () => void beginAnswer(step.index));
      } else {
        setStep({ kind: "closing" });
      }
    } else if (step.kind === "closing") {
      sayThen(closing, finish);
    }

    return () => {
      cancelled = true;
    };
  }, [step, questions, closing, say, beginAnswer, finish]);

  // When the user finishes their response, stop recording and advance to the next question
  // so ElevenLabs immediately speaks the next question.
  const doneAnswering = async (index: number) => {
    setError(null);
    setStep({ kind: "stopping", index });
    try {
      answers.current = [...answers.current, await stopCapture()];
      setStep(index + 1 < questions.length ? { kind: "asking", index: index + 1 } : { kind: "closing" });
    } catch (stopError) {
      setStep({ kind: "answering", index });
      setError({ message: errorMessage(stopError), retry: () => void doneAnswering(index) });
    }
  };

  const skipToReflection = async () => {
    const wasRunning = isRunning();
    setStep({ kind: "finished" });
    if (wasRunning) {
      try {
        // Keep the partial answer: it's still useful for the Reflection.
        answers.current = [...answers.current, await stopCapture()];
      } catch {
        // Capture is discarded on unmount; move on with the answers so far.
      }
    }
    onFinished(answers.current);
  };

  const questionIndex = "index" in step ? step.index : questions.length;
  const busy = step.kind === "starting" || step.kind === "stopping" || step.kind === "finished";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <CameraPlaceholder live={step.kind === "answering"} />

        <section aria-label="Your Answer Transcript" className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Your Response (Live Transcript)
            </h2>
            {step.kind === "answering" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span className="size-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
                Listening to your answer…
              </span>
            )}
          </div>
          <p
            aria-live="polite"
            className="max-h-36 min-h-14 overflow-y-auto whitespace-pre-wrap text-base leading-relaxed text-neutral-800 dark:text-neutral-200"
          >
            {liveTranscript || (
              <span className="text-neutral-400 dark:text-neutral-500">
                {step.kind === "asking"
                  ? "ElevenLabs is speaking the question…"
                  : step.kind === "answering"
                    ? 'Speak your answer into the microphone, then click "Done answering" for the next question…'
                    : "Waiting for the next step…"}
              </span>
            )}
          </p>
        </section>

        {error && <ErrorView compact message={error.message} onRetry={error.retry} />}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => step.kind === "answering" && void doneAnswering(step.index)}
            disabled={step.kind !== "answering" || isSpeaking}
            className="btn-primary"
          >
            {step.kind === "stopping" ? "Saving answer…" : "Done answering"}
          </button>
          <button type="button" onClick={skipToReflection} disabled={busy} className="btn-secondary">
            Skip to Reflection
          </button>
          <span className="ml-auto">
            <QuitButton onQuit={onQuit} disabled={step.kind === "finished"} />
          </span>
        </div>

        <p className="text-sm text-neutral-500 dark:text-neutral-400">{statusText(step)}</p>
      </div>

      <aside className="flex flex-col gap-4">
        <QuestionProgress current={questionIndex} total={questions.length} questions={questions} />
        <Host caption={caption} isSpeaking={isSpeaking} />
      </aside>
    </div>
  );
}

function statusText(step: Step): string {
  switch (step.kind) {
    case "asking":
      return "Listen as the Host asks the question.";
    case "starting":
      return "Starting microphone for your answer…";
    case "answering":
      return 'Answer aloud, then press "Done answering" to hear the next question.';
    case "stopping":
      return "Saving your answer…";
    case "closing":
    case "finished":
      return "Q&A is over. Your Reflection is next.";
  }
}

function QuestionProgress({
  current,
  total,
  questions,
}: {
  current: number;
  total: number;
  questions: Question[];
}) {
  const label =
    current < 0 ? "Q&A is starting" : current >= total ? "All Questions answered" : `Question ${current + 1} of ${total}`;
  return (
    <section aria-label="Question progress" className="card">
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Q&amp;A</p>
      <p className="mt-1 text-2xl font-semibold">{label}</p>
      <div aria-hidden className="mt-4 flex gap-2">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < current
                ? "bg-indigo-600 dark:bg-indigo-500"
                : index === current
                  ? "bg-indigo-300 dark:bg-indigo-800"
                  : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          />
        ))}
      </div>
      <ol className="mt-4 flex flex-col gap-2 text-sm">
        {questions.map((question, index) => {
          const isCurrent = index === current;
          const isDone = index < current;
          return (
            <li
              key={question.id}
              className={`rounded-md px-2.5 py-1.5 ${
                isCurrent
                  ? "bg-indigo-50 font-medium text-indigo-950 dark:bg-indigo-950/60 dark:text-indigo-100"
                  : isDone
                    ? "text-neutral-400 line-through dark:text-neutral-500"
                    : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {index + 1}. {question.text}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
