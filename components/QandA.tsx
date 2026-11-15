"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncView, ErrorView, errorMessage } from "@/components/AsyncView";
import WebcamViewer from "@/app/components/WebcamViewer";
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
    <AsyncView run={loadScript} label="The host is preparing questions…">
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
    let canceled = false;
    const sayThen = (text: string, next: () => void) => {
      setError(null);
      say(text).then(
        () => {
          if (!canceled) next();
        },
        (speakError: unknown) => {
          if (!canceled) setError({ message: errorMessage(speakError), retry: () => setStep({ ...step }) });
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
      canceled = true;
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
    <div className="flex flex-col gap-5">
      <QuestionProgress current={questionIndex} total={questions.length} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WebcamViewer className="aspect-video lg:aspect-auto lg:h-[clamp(14rem,42vh,34rem)]" />

          <section aria-label="Your answer transcript" className="pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">Your answer</h2>
              {step.kind === "answering" && (
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span aria-hidden className="live-mark" />
                  Listening…
                </span>
              )}
            </div>
            <p aria-live="polite" className="max-h-36 min-h-14 overflow-y-auto whitespace-pre-wrap text-lg">
              {liveTranscript || (
                <span className="text-mute">
                  {step.kind === "asking"
                    ? "The host is asking the question…"
                    : step.kind === "answering"
                      ? 'Speak your answer, then press "Done answering" for the next question…'
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

          <p className="text-mute">{statusText(step)}</p>
        </div>

        <aside className="flex flex-col gap-8">
          <Host caption={caption} isSpeaking={isSpeaking} />
          <QuestionList current={questionIndex} questions={questions} />
        </aside>
      </div>
    </div>
  );
}

function statusText(step: Step): string {
  switch (step.kind) {
    case "asking":
      return "Listen as the host asks the question.";
    case "starting":
      return "Starting microphone for your answer…";
    case "answering":
      return 'Answer aloud, then press "Done answering" to hear the next question.';
    case "stopping":
      return "Saving your answer…";
    case "closing":
    case "finished":
      return "Q&A is over. Your reflection is next.";
  }
}

/** A bar across the top of Q&A, like the Delivery timer: which Question this is, and a segment per Question. */
function QuestionProgress({ current, total }: { current: number; total: number }) {
  const label =
    current < 0 ? "Q&A is starting" : current >= total ? "All questions answered" : `Question ${current + 1} of ${total}`;
  return (
    <section
      aria-label="Question progress"
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-3"
    >
      <p className="text-5xl font-bold leading-none tracking-[-0.03em] font-display">{label}</p>
      {/* Filled up to and including the Question being asked. */}
      <div aria-hidden className="flex w-full max-w-xs gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={`h-2 flex-1 ${index <= current ? "bg-ink" : "bg-field"}`} />
        ))}
      </div>
    </section>
  );
}

/** Every Question in order beside the Host: answered ones struck through, the current one set bold. */
function QuestionList({ current, questions }: { current: number; questions: Question[] }) {
  return (
    <section aria-label="Questions" className="pt-3">
      <h2 className="text-lg font-bold">Questions</h2>
      <ol className="mt-2 flex flex-col gap-2">
        {questions.map((question, index) => {
          const isCurrent = index === current;
          const isDone = index < current;
          return (
            <li
              key={question.id}
              aria-current={isCurrent ? "step" : undefined}
              className={isCurrent ? "font-semibold" : isDone ? "text-mute line-through" : "text-mute"}
            >
              {index + 1}. {question.text}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
