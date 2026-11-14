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
  qaHandoff: string;
  closing: string;
}

/** The Q&A Phase (Normal Mode only): the Host asks Questions and the Speaker answers aloud. */
export function QandA({ brief, delivery, onFinished, onQuit }: QandAProps) {
  const loadScript = async (): Promise<QandAScript> => {
    const [questions, qaHandoff, closing] = await Promise.all([
      services.hostBrain.getQuestions(brief, delivery),
      services.hostBrain.getFormality("qaHandoff", "normal"),
      services.hostBrain.getFormality("closing", "normal"),
    ]);
    return { questions, qaHandoff, closing };
  };

  return (
    <AsyncView run={loadScript} label="The Host is preparing Questions…">
      {(script) => <QandASession script={script} onFinished={onFinished} onQuit={onQuit} />}
    </AsyncView>
  );
}

type Step =
  | { kind: "handoff" }
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
  const { questions, qaHandoff, closing } = script;
  const { caption, isSpeaking, say } = useHost();
  const capture = useSpeechCapture();
  const [step, setStep] = useState<Step>({ kind: "handoff" });
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
        await capture.start();
        setStep({ kind: "answering", index });
      } catch (startError) {
        setError({ message: errorMessage(startError), retry: () => void beginAnswer(index) });
      }
    },
    [capture],
  );

  // Each Host line is said when its step begins; the next step follows when the Host finishes.
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

    if (step.kind === "handoff") {
      sayThen(qaHandoff, () => setStep(questions.length > 0 ? { kind: "asking", index: 0 } : { kind: "closing" }));
    } else if (step.kind === "asking") {
      const question = questions[step.index];
      if (question) sayThen(question.text, () => void beginAnswer(step.index));
    } else if (step.kind === "closing") {
      sayThen(closing, finish);
    }

    return () => {
      cancelled = true;
    };
  }, [step, questions, qaHandoff, closing, say, beginAnswer, finish]);

  const doneAnswering = async (index: number) => {
    setError(null);
    setStep({ kind: "stopping", index });
    try {
      answers.current = [...answers.current, await capture.stop()];
      setStep(index + 1 < questions.length ? { kind: "asking", index: index + 1 } : { kind: "closing" });
    } catch (stopError) {
      setStep({ kind: "answering", index });
      setError({ message: errorMessage(stopError), retry: () => void doneAnswering(index) });
    }
  };

  const skipToReflection = async () => {
    const wasRunning = capture.isRunning();
    setStep({ kind: "finished" });
    if (wasRunning) {
      try {
        // Keep the partial answer: it's still useful for the Reflection.
        answers.current = [...answers.current, await capture.stop()];
      } catch {
        // Capture is discarded on unmount; move on with the answers so far.
      }
    }
    onFinished(answers.current);
  };

  const questionIndex = "index" in step ? step.index : step.kind === "handoff" ? -1 : questions.length;
  const busy = step.kind === "starting" || step.kind === "stopping" || step.kind === "finished";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <CameraPlaceholder live={step.kind === "answering"} />

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
        <QuestionProgress current={questionIndex} total={questions.length} />
        <Host caption={caption} isSpeaking={isSpeaking} />
      </aside>
    </div>
  );
}

function statusText(step: Step): string {
  switch (step.kind) {
    case "handoff":
    case "asking":
      return "Listen to the Host.";
    case "starting":
      return "Getting ready to listen…";
    case "answering":
      return 'Answer aloud, then press "Done answering".';
    case "stopping":
      return "Saving your answer…";
    case "closing":
    case "finished":
      return "Q&A is over. Your Reflection is next.";
  }
}

function QuestionProgress({ current, total }: { current: number; total: number }) {
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
    </section>
  );
}
